import { permissions, permissionRefusal } from '../access';
import { command } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { digest, humanCode, opaqueToken } from '../lib/guest-proof';
import { DOOR_STATUSES, MAX_COMP_QTY, assertDoorQuantity, assertRoom, settleTender, pickPhase, priceDoorSale } from '../lib/door-sale';
import { expireHolds } from './inventory';
import { bookDrawer } from './cashDrawers';

type Kind = 'door' | 'comp';

async function activePhase(tx: any, levelId: string, qty: number) {
  const phases = await tx.priceLevelPhase.findMany({ where: { priceLevelId: levelId, startsAt: { lte: new Date() } }, orderBy: { sort: 'asc' } });
  const reserved: Record<string, number> = {};
  for (const p of phases) reserved[p.id] = (await tx.inventoryHold.aggregate({ where: { phaseId: p.id, status: 'active' }, _sum: { quantity: true } }))._sum.quantity || 0;
  return pickPhase(phases, reserved, qty);
}

/** Read-only quote for the panel: same phase lookup and same priceDoorSale() the charge uses. */
export async function previewDoorSale(_: any, { input }: any, context: any) {
  if (!permissions.canManageOrders({ session: context.session })) throw new Error(permissionRefusal('canManageOrders'));
  const kind: Kind = input.comp ? 'comp' : 'door';
  const qty = assertDoorQuantity(input.qty, kind === 'comp' ? MAX_COMP_QTY : undefined);
  const level = await context.prisma.priceLevel.findUnique({ where: { id: input.levelId }, include: { event: { include: { venue: true } } } });
  if (!level || level.eventId !== input.eventId) throw new Error('Invalid price level');
  const phase = kind === 'door' ? await activePhase(context.prisma, level.id, qty) : null;
  const { unitPriceCents, quote } = priceDoorSale(kind, level, phase, qty, level.event.venue.taxBps);
  return { unitPriceCents, phaseName: phase?.name || '', ...quote };
}

/** Door sale and comp share one inventory path: event lock, capacity re-check, order, line, tickets, audit. */
async function issue(kind: Kind, input: any, context: any) {
  if (!permissions.canManageOrders({ session: context.session })) throw new Error(permissionRefusal('canManageOrders'));
  if (!input?.idempotencyKey) throw new Error('Idempotency key required');
  const actor = context.session.itemId;
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const reason = String(input.reason || '').trim();
  if (!name) throw new Error('Name required');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Valid email required');
  if (kind === 'comp' && !reason) throw new Error('Reason required for a comp');
  const seatIds: string[] | null = input.seatInventoryIds?.length ? input.seatInventoryIds : null;
  if (seatIds && (new Set(seatIds).size !== seatIds.length || seatIds.length !== input.qty)) throw new Error('Pick one distinct seat per ticket');
  const qty = assertDoorQuantity(input.qty, kind === 'comp' ? MAX_COMP_QTY : undefined);
  return command(context, { operation: kind === 'comp' ? 'issueComp' : 'issueDoorSale', idempotencyKey: input.idempotencyKey, lock: `event:${input.eventId}`, params: { eventId: input.eventId, levelId: input.levelId, qty, seatIds, name, email, reason, tender: input.tender } }, async tx => {
    await expireHolds(tx, input.eventId);
    const event = await tx.event.findUnique({ where: { id: input.eventId }, include: { venue: true } });
    if (!event || !DOOR_STATUSES.includes(event.status)) throw new Error('Event is not selling');
    const level = await tx.priceLevel.findUnique({ where: { id: input.levelId }, include: { sections: true } });
    if (!level || level.eventId !== event.id || level.status !== 'active') throw new Error('Invalid price level');
    const reserved = level.sections.some((s: any) => s.kind !== 'ga');
    if (reserved && !seatIds) throw new Error('Pick seats for a reserved level');
    if (!reserved && seatIds) throw new Error('General admission has no seats to pick');
    // Reserved: the exact seats must be open in this level; they are taken by compare-and-set below.
    const seats = seatIds ? await tx.seatInventory.findMany({ where: { id: { in: seatIds }, eventId: event.id }, include: { seat: true } }) : [];
    if (seatIds && (seats.length !== seatIds.length || seats.some((s: any) => s.status !== 'open' || s.priceLevelId !== level.id))) throw new Error('A picked seat is no longer open in this level');
    if (event.ageRestriction !== 'all_ages' && kind === 'door' && !input.ageAttested) throw new Error('Age confirmation required');
    assertRoom(level, qty);
    for (const section of level.sections) {
      const siblings = await tx.priceLevel.findMany({ where: { eventId: event.id, sections: { some: { id: section.id } } } });
      if (section.kind === 'ga' && siblings.reduce((n: number, l: any) => n + l.sold + l.held + l.productionHeld, 0) + qty > section.capacity) throw new Error('Section capacity exhausted');
    }
    const phase = kind === 'door' ? await activePhase(tx, level.id, qty) : null;
    const { unitPriceCents: unit, quote } = priceDoorSale(kind, level, phase, qty, event.venue.taxBps);
    const tender = kind === 'door' ? settleTender(quote.totalCents, input.tender) : null;
    const order = await tx.ticketOrder.create({ data: { orderNumber: humanCode('CN'), guestEmail: email, guestName: name, secretKey: digest(opaqueToken()), ...quote, currencyCode: level.currencyCode, ageAttested: kind === 'door' ? !!input.ageAttested : false, status: kind === 'comp' ? 'comp' : 'paid', source: kind === 'comp' ? 'comp' : 'box_office', eventId: event.id, customerId: null, discountSnapshot: kind === 'comp' ? { comp: true, reason } : undefined } });
    const line = await tx.ticketOrderLine.create({ data: { orderId: order.id, title: event.title, levelName: level.name, phaseName: phase?.name || '', seatLabel: seats.map((s: any) => s.seat.label).join(', '), unitPriceCents: unit, serviceFeeCents: 0, facilityFeeCents: level.facilityFeeCents, taxCents: quote.taxCents, quantity: qty, discountCents: 0, totalCents: quote.totalCents, currencyCode: level.currencyCode, priceLevelId: level.id, phaseId: phase?.id } });
    const tickets: { ticketCode: string; token: string; seat: string }[] = [];
    for (let i = 0; i < qty; i++) {
      const token = opaqueToken(); const ticketCode = humanCode('TK');
      const seat = seats[i];
      if (seat) {
        const taken = await tx.seatInventory.updateMany({ where: { id: seat.id, status: 'open' }, data: { status: 'sold', holdKey: '', occupancyKey: `${event.id}:${seat.seatId}` } });
        if (taken.count !== 1) throw new Error('A picked seat is no longer open in this level');
      }
      await tx.ticket.create({ data: { orderId: order.id, eventId: event.id, lineId: line.id, seatInventoryId: seat?.id, ticketCode, tokenHash: digest(token), holderName: name, holderEmail: email, status: 'valid' } });
      tickets.push({ ticketCode, token, seat: seat?.seat.label || '' });
    }
    const lvl = await tx.priceLevel.updateMany({ where: { id: level.id, sold: level.sold }, data: { sold: { increment: qty } } });
    if (lvl.count !== 1) throw new Error('Level counters changed; retry');
    if (phase) await tx.priceLevelPhase.update({ where: { id: phase.id }, data: { sold: { increment: qty } } });
    const drawerId = tender?.method === 'cash' ? await bookDrawer(tx, actor, 'cashSalesCents', quote.totalCents) : null;
    if (tender) await tx.payment.create({ data: { idempotencyKey: `door:${input.idempotencyKey}`, amount: quote.totalCents, currencyCode: level.currencyCode, status: 'succeeded', paymentMethod: tender.method, orderId: order.id, processedAt: new Date(), notes: tender.method === 'cash' ? 'Door cash' : 'Door card terminal', data: { channel: 'door', drawerId, changeCents: tender.changeCents, tenderedCents: input.tender?.tenderedCents ?? null, terminalReference: tender.reference } } });
    await appendAuditEvent(tx, actor, { action: kind === 'comp' ? 'order.comp_issued' : 'order.door_sale', targetList: 'TicketOrder', targetId: order.id, after: { qty, seats: seats.map((s: any) => s.seat.label), totalCents: quote.totalCents, tender: tender?.method ?? 'comp' }, reason });
    return { orderId: order.id, orderNumber: order.orderNumber, status: order.status, totalCents: quote.totalCents, changeCents: tender?.changeCents ?? 0, tickets };
  });
}
export const issueDoorSale = (_: any, { input }: any, context: any) => issue('door', input, context);
export const issueComp = (_: any, { input }: any, context: any) => issue('comp', input, context);
