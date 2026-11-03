import { command, lockTransactionKey, checkedClient } from '../lib/transaction';
import { createProof, opaqueToken, digest } from '../lib/guest-proof';
import { ticketQuote } from '../lib/settlement';
import { appendAuditEvent } from '../lib/audit';

export async function expireHolds(tx: any, eventId: string) {
  const holds = await tx.inventoryHold.findMany({ where: { eventId, status: 'active', expiresAt: { lte: new Date() }, order: null }, include: { seats: true } });
  for (const hold of holds) {
    await tx.inventoryHold.update({ where: { id: hold.id }, data: { status: 'expired', seats: { set: [] } } });
    await tx.priceLevel.update({ where: { id: hold.priceLevelId }, data: { held: { decrement: hold.quantity } } });
    for (const seat of hold.seats) await tx.seatInventory.updateMany({ where: { id: seat.id, status: 'held', holdKey: hold.holdKey }, data: { status: 'open', occupancyKey: null, holdKey: '' } });
    await tx.promoRedemption.updateMany({ where: { holdId: hold.id, status: 'reserved' }, data: { status: 'released' } });
  }
  const blocks = await tx.productionHold.findMany({ where: { eventId, status: 'active', releaseAt: { lte: new Date() } }, include: { seats: true } });
  for (const block of blocks) await releaseBlock(tx, block);
}
export async function releaseBlock(tx: any, block: any) {
  const updated = await tx.productionHold.updateMany({ where: { id: block.id, status: 'active' }, data: { status: 'released' } });
  if (updated.count !== 1) return;
  if (block.priceLevelId) await tx.priceLevel.update({ where: { id: block.priceLevelId }, data: { productionHeld: { decrement: block.quantity } } });
  for (const seat of block.seats || []) await tx.seatInventory.updateMany({ where: { id: seat.id, status: 'reserved_hold' }, data: { status: 'open', occupancyKey: null } });
}
export async function availability(_: any, { eventId }: any, context: any) {
  return context.prisma.$transaction(async (raw: any) => {
    const tx = checkedClient(raw); await lockTransactionKey(tx, `event:${eventId}`); await expireHolds(tx, eventId);
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true, showAt: true, doorsAt: true, ageRestriction: true, description: true, venue: { select: { name: true, city: true } } } });
    if (!event || !['announced', 'presale', 'on_sale', 'sold_out', 'postponed'].includes(event.status)) throw new Error('Event unavailable');
    const levels = await tx.priceLevel.findMany({ where: { eventId, status: 'active' }, select: { id: true, name: true, priceCents: true, feeCents: true, facilityFeeCents: true, capacity: true, sold: true, held: true, productionHeld: true, perOrderLimit: true, currencyCode: true, sections: { select: { id: true, name: true, kind: true, capacity: true } }, priceLevelPhase_priceLevel: { select: { id: true, name: true, priceCents: true, quantity: true, sold: true, startsAt: true, sort: true } } } });
    const seats = await tx.seatInventory.findMany({ where: { eventId }, select: { id: true, status: true, priceLevelId: true, seat: { select: { label: true, row: true, number: true, accessible: true, obstructed: true, chartSectionId: true } } }, take: 10000 });
    return { event, levels, seats };
  });
}
export async function createHold(_: any, args: any, context: any) {
  if (!args.idempotencyKey) throw new Error('Idempotency key required');
  return command(context, { operation: args.seatInventoryIds ? 'createSeatHold' : 'createGaHold', lock: `event:${args.eventId}`, idempotencyKey: args.idempotencyKey, params: args }, async tx => {
    await expireHolds(tx, args.eventId);
    const event = await tx.event.findUnique({ where: { id: args.eventId }, include: { venue: true } });
    if (!event || !['presale', 'on_sale'].includes(event.status)) throw new Error('Event is not on sale');
    const ids = args.seatInventoryIds;
    if (ids && (!ids.length || ids.length > 8 || new Set(ids).size !== ids.length)) throw new Error('Select 1–8 distinct seats');
    const seats = ids ? await tx.seatInventory.findMany({ where: { id: { in: ids }, eventId: event.id }, include: { seat: true } }) : [];
    if (ids && (seats.length !== ids.length || seats.some((s: any) => s.status !== 'open') || new Set(seats.map((s: any) => s.priceLevelId)).size !== 1)) throw new Error('Select open seats in one price level');
    const levelId = seats[0]?.priceLevelId || args.levelId;
    const level = await tx.priceLevel.findUnique({ where: { id: levelId }, include: { sections: true } });
    const qty = ids ? ids.length : args.qty;
    if (!level || level.eventId !== event.id || level.status !== 'active' || !Number.isInteger(qty) || qty < 1 || qty > level.perOrderLimit) throw new Error('Invalid level or quantity');
    if (!ids && level.sections.some((s: any) => s.kind !== 'ga')) throw new Error('Select reserved seats');
    if ((level.salesStartAt && level.salesStartAt > new Date()) || (level.salesEndAt && level.salesEndAt <= new Date())) throw new Error('Sales window closed');
    const presale = event.status === 'presale' || (event.onSaleAt && event.onSaleAt > new Date());
    let promo: any = null;
    if (args.presaleCode) {
      promo = await tx.promoCode.findUnique({ where: { code: String(args.presaleCode).toUpperCase() }, include: { priceLevels: true } });
      const live = promo ? await tx.promoRedemption.count({ where: { promoCodeId: promo.id, status: { in: ['reserved', 'committed'] } } }) : 0;
      if (!promo || promo.status !== 'active' || promo.discountType === 'comp' || (promo.eventId && promo.eventId !== event.id) || (promo.priceLevels.length && !promo.priceLevels.some((x: any) => x.id === level.id)) || (promo.startsAt && promo.startsAt > new Date()) || (promo.endsAt && promo.endsAt <= new Date()) || (promo.maxUses && live >= promo.maxUses) || (promo.perOrderLimit && qty > promo.perOrderLimit)) throw new Error('Invalid or exhausted code');
    }
    if (presale && !promo && (!event.presaleCode || event.presaleCode !== args.presaleCode)) throw new Error('Presale code required');
    if (level.sold + level.held + level.productionHeld + qty > level.capacity) throw new Error('Capacity exhausted');
    // Sections may be shared by levels: recount all live level allocations under the event lock.
    for (const section of level.sections) {
      const siblings = await tx.priceLevel.findMany({ where: { eventId: event.id, sections: { some: { id: section.id } } } });
      if (section.kind === 'ga' && siblings.reduce((n: number, l: any) => n + l.sold + l.held + l.productionHeld, 0) + qty > section.capacity) throw new Error('Section capacity exhausted');
    }
    const phases = await tx.priceLevelPhase.findMany({ where: { priceLevelId: level.id, startsAt: { lte: new Date() } }, orderBy: { sort: 'asc' } });
    let phase: any = null;
    for (const p of phases) { const reserved = await tx.inventoryHold.aggregate({ where: { phaseId: p.id, status: 'active' }, _sum: { quantity: true } }); if (p.sold + (reserved._sum.quantity || 0) < p.quantity) { phase = p; if (p.sold + (reserved._sum.quantity || 0) + qty > p.quantity) throw new Error('Quantity exceeds remaining phase tickets'); break; } }
    if (phases.length && !phase) throw new Error('Pricing phase exhausted');
    const price = phase?.priceCents ?? level.priceCents;
    const quote = { ...ticketQuote({ priceCents: price, feeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, quantity: qty, taxBps: event.venue.taxBps, discountBps: promo?.discountType === 'percent_bps' ? promo.value : 0, discountFixedCents: promo?.discountType === 'amount_cents' ? promo.value : 0 }), eventTitle: event.title, levelName: level.name, phaseName: phase?.name || '', unitPriceCents: price, feeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, currencyCode: level.currencyCode, seats: seats.map((s: any) => ({ id: s.id, label: s.seat.label })), perOrderLimit: level.perOrderLimit };
    const key = opaqueToken();
    const hold = await tx.inventoryHold.create({ data: { eventId: event.id, priceLevelId: level.id, phaseId: phase?.id, customerId: context.session?.itemId || null, holdKey: key, secretHash: digest(key), quantity: qty, expiresAt: new Date(Date.now() + 600000), status: 'active', quoteSnapshot: quote, presaleCode: args.presaleCode || '', seats: { connect: seats.map((s: any) => ({ id: s.id })) } } });
    await tx.priceLevel.update({ where: { id: level.id }, data: { held: { increment: qty } } });
    for (const seat of seats) await tx.seatInventory.update({ where: { id: seat.id }, data: { status: 'held', holdKey: key, occupancyKey: `${event.id}:${seat.seatId}` } });
    if (promo) await tx.promoRedemption.create({ data: { promoCodeId: promo.id, holdId: hold.id, amountCents: quote.discountCents, status: 'reserved' } });
    await appendAuditEvent(tx, context.session?.itemId, { action: 'hold.created', targetList: 'InventoryHold', targetId: hold.id, after: { quantity: qty, eventId: event.id } });
    return { id: hold.id, proof: createProof(hold.id), expiresAt: hold.expiresAt.toISOString(), quote };
  });
}
