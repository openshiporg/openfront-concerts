import { permissions, type Permission } from '../access';
import { command, transition } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { digest, canonicalDigest, humanCode, opaqueToken } from '../lib/guest-proof';
import { computeSettlement as calculate, percentage } from '../lib/settlement';
import { expireHolds, releaseBlock } from './inventory';
import { assertEventTransition } from '../lib/event-lifecycle';
import { zonedDateTime, holdDay } from '../lib/venue-time';
import { validateCountMaps } from '../lib/editors';

export function authorize(context: any, permission: Permission) {
  if (!permissions[permission]({ session: context.session })) throw new Error(`Permission required: ${permission}`);
}
const required: Record<string, Permission> = { releaseDateHold: 'canManageEvents', advanceEvent: 'canManageEvents', placeDateHold: 'canManageEvents', challengeHold: 'canManageEvents', confirmHold: 'canManageEvents', sendOffer: 'canManageDeals', acceptOffer: 'canManageDeals', declineOffer: 'canManageDeals', contractOffer: 'canManageDeals', publishEvent: 'canManageEvents', setProductionHold: 'canManageInventory', releaseProductionHold: 'canManageInventory', scanTicket: 'canScanTickets', recordMerchSales: 'canManageSettlements', computeSettlement: 'canManageSettlements', adjustSettlement: 'canManageSettlements', signSettlement: 'canManageSettlements', recordArtistPayment: 'canManageSettlements', postponeEvent: 'canManageEvents', cancelEvent: 'canManageEvents' };
export function operator(operation: string) {
  return async (_: any, { input }: any, context: any) => {
    authorize(context, required[operation]);
    if (!input || !input.idempotencyKey) throw new Error('Idempotency key required');
    const actor = context.session.itemId;
    // Resolve the authoritative event before choosing the inventory lock; never trust a second event id.
    let eventId = input.eventId;
    if (input.holdId && ['challengeHold', 'confirmHold', 'releaseDateHold'].includes(operation)) {
      const hold = await context.prisma.dateHold.findUnique({ where: { id: input.holdId } });
      if (!hold) throw new Error('Date hold not found');
      eventId = hold.eventId;
      input = { ...input, venueId: hold.venueId, date: hold.date.toISOString() };
    }
    if (input.offerId) { const row = await context.prisma.offer.findUnique({ where: { id: input.offerId } }); if (!row) throw new Error('Offer not found'); eventId = row.eventId; }
    if (input.settlementId) { const row = await context.prisma.settlement.findUnique({ where: { id: input.settlementId } }); if (!row) throw new Error('Settlement not found'); eventId = row.eventId; }
    if (input.productionHoldId) { const row = await context.prisma.productionHold.findUnique({ where: { id: input.productionHoldId } }); if (!row) throw new Error('Production hold not found'); eventId = row.eventId; }
    if (operation === 'placeDateHold') input = { ...input, date: holdDay(input.date) };
    const lock = operation.includes('Hold') && ['placeDateHold', 'challengeHold', 'confirmHold', 'releaseDateHold'].includes(operation) ? `date:${input.venueId}:${String(input.date).slice(0, 10)}` : `event:${eventId}`;
    return command(context, { operation, idempotencyKey: input.idempotencyKey, lock, params: input }, async tx => {
      const audit = async (list: string, id: string, after: any, reason = '') => appendAuditEvent(tx, actor, { action: operation, targetList: list, targetId: id, after, reason });
      if (operation === 'placeDateHold') {
        const date = new Date(input.date); if (Number.isNaN(+date) || !Number.isInteger(input.rank) || input.rank < 1) throw new Error('Valid date and positive rank required');
        if (!input.venueId || !(await tx.venue.findUnique({ where: { id: input.venueId } }))) throw new Error('Venue required');
        if (date < new Date(holdDay(new Date().toISOString()))) throw new Error('Date is in the past');
        if (input.artistId && !(await tx.artist.findUnique({ where: { id: input.artistId } }))) throw new Error('Artist not found');
        if (input.expiresAt && !(new Date(input.expiresAt) > new Date())) throw new Error('Expiry must be in the future');
        if (await tx.dateHold.count({ where: { venueId: input.venueId, date, status: 'confirmed' } })) throw new Error('Date is already confirmed');
        // A lapsed hold keeps its rank key forever unless it is released; the rank is free again once it has expired.
        const lapsed = await tx.dateHold.findMany({ where: { venueId: input.venueId, date, status: { in: ['held', 'challenged'] }, expiresAt: { lte: new Date() } } });
        for (const l of lapsed) await transition(tx, 'dateHold', l.id, l.status, 'released', actor, 'Hold expired', { rankKey: null });
        const rankKey = `${input.venueId}:${date.toISOString().slice(0, 10)}:${input.rank}`;
        if (await tx.dateHold.findUnique({ where: { rankKey } })) throw new Error(`Rank ${input.rank} is already held for this date`);
        const row = await tx.dateHold.create({ data: { venueId: input.venueId, date, artistId: input.artistId, agencyId: input.agencyId, rank: input.rank, rankKey, status: 'held', expiresAt: input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 604800000) } });
        await audit('DateHold', row.id, { rank: row.rank }); return { id: row.id, status: row.status };
      }
      if (operation === 'releaseDateHold') {
        const row = await tx.dateHold.findUnique({ where: { id: input.holdId } });
        if (!row || !['held', 'challenged'].includes(row.status)) throw new Error('Only an unconfirmed hold can be released');
        await transition(tx, 'dateHold', row.id, row.status, 'released', actor, input.reason || 'Released by promoter', { rankKey: null });
        return { id: row.id, status: 'released' };
      }
      if (operation === 'challengeHold') {
        const row = await tx.dateHold.findUnique({ where: { id: input.holdId } });
        if (!row || row.expiresAt <= new Date()) throw new Error('Hold expired');
        await transition(tx, 'dateHold', row.id, 'held', 'challenged', actor); return { id: row.id, status: 'challenged' };
      }
      if (operation === 'confirmHold') {
        const row = await tx.dateHold.findUnique({ where: { id: input.holdId } });
        if (!row || !['held', 'challenged'].includes(row.status) || row.expiresAt <= new Date()) throw new Error('Hold cannot be confirmed');
        const prior = await tx.dateHold.count({ where: { venueId: row.venueId, date: row.date, OR: [{ status: 'confirmed' }, { status: { in: ['held', 'challenged'] }, expiresAt: { gt: new Date() }, rank: { lt: row.rank } }] } });
        if (prior) throw new Error('Earlier ranked hold must be released');
        const title = String(input.title || '').trim();
        if (!title) throw new Error('Event title required');
        const chart = await tx.seatingChart.findUnique({ where: { id: input.seatingChartId } });
        if (!chart || chart.venueId !== row.venueId || chart.status !== 'published') throw new Error('Published venue chart required');
        if (input.ageRestriction && !['all_ages', '18_plus', '21_plus'].includes(input.ageRestriction)) throw new Error('Unknown age restriction');
        const venue = await tx.venue.findUnique({ where: { id: row.venueId } });
        const day = row.date.toISOString().slice(0, 10);
        const showAt = input.showTime ? zonedDateTime(day, input.showTime, venue?.timezone || 'UTC') : new Date(input.showAt || row.date);
        const doorsAt = input.doorsTime ? zonedDateTime(day, input.doorsTime, venue?.timezone || 'UTC') : new Date(input.doorsAt || row.date);
        if (Number.isNaN(+showAt) || Number.isNaN(+doorsAt) || doorsAt > showAt) throw new Error('Doors must open before the show');
        const event = await tx.event.create({ data: { title, venueId: row.venueId, seatingChartId: chart.id, showAt, doorsAt, status: 'hold', promoterId: actor, ageRestriction: input.ageRestriction || 'all_ages' } });
        await transition(tx, 'dateHold', row.id, row.status, 'confirmed', actor, '', { eventId: event.id });
        if (row.artistId) await tx.eventArtist.create({ data: { eventId: event.id, artistId: row.artistId, billing: 'headliner', position: 1 } });
        await audit('Event', event.id, { status: 'hold' }); return { id: row.id, eventId: event.id, status: 'confirmed' };
      }
      if (operation === 'declineOffer') {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (!offer) throw new Error('Offer not found');
        if (!String(input.reason || '').trim()) throw new Error('Decline reason required');
        await transition(tx, 'offer', offer.id, 'sent', 'declined', actor, String(input.reason).trim());
        return { id: offer.id, status: 'declined' };
      }
      if (operation === 'contractOffer') {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (!offer) throw new Error('Offer not found');
        // The contract is the accepted terms; any later edit to the offer row must not slip into it.
        if (!offer.acceptedTerms || canonicalDigest(offer.acceptedTerms) !== offer.acceptedTermsHash) throw new Error('Accepted terms hash mismatch');
        if (canonicalDigest(termsOf(offer)) !== offer.acceptedTermsHash) throw new Error('Offer changed after acceptance; send a new offer version');
        if (!String(input.reference || '').trim()) throw new Error('Contract reference required');
        await transition(tx, 'offer', offer.id, 'accepted', 'contracted', actor, '', { notes: [offer.notes, `Contract ${String(input.reference).trim()}`].filter(Boolean).join('\n') });
        return { id: offer.id, status: 'contracted' };
      }
      if (operation === 'sendOffer' || operation === 'acceptOffer') {
        const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
        if (!offer) throw new Error('Offer not found');
        const terms = termsOf(offer);
        const status = operation === 'sendOffer' ? 'sent' : 'accepted';
        await transition(tx, 'offer', offer.id, operation === 'sendOffer' ? 'draft' : 'sent', status, actor, '', status === 'accepted' ? { acceptedTerms: terms, acceptedTermsHash: canonicalDigest((terms)) } : {});
        return { id: offer.id, status };
      }
      if (operation === 'advanceEvent') {
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error('Event not found');
        assertEventTransition(event.status, input.status, input.reason);
        if (['presale', 'on_sale'].includes(input.status)) {
          const levels = await tx.priceLevel.findMany({ where: { eventId, status: 'active' } });
          if (!levels.length) throw new Error('Active pricing required before opening sales');
        }
        await transition(tx, 'event', eventId, event.status, input.status, actor, input.reason || '');
        return { id: eventId, status: input.status };
      }
      if (operation === 'publishEvent') {
        const event = await tx.event.findUnique({ where: { id: eventId }, include: { seatingChart: true } });
        if (!event || event.status !== 'hold' || event.seatingChart?.status !== 'published') throw new Error('Confirmed event and published chart required');
        const sections = await tx.chartSection.findMany({ where: { chartId: event.seatingChartId }, include: { seat_chartSection: true } });
        const rows: any[] = [];
        for (const section of sections) {
          const levels = await tx.priceLevel.findMany({ where: { eventId, sections: { some: { id: section.id } } } });
          if (!levels.length) throw new Error('Every section requires pricing');
          if (section.kind === 'reserved') for (const seat of section.seat_chartSection) rows.push({ eventId, seatId: seat.id, priceLevelId: levels[0].id, eventSeatKey: `${eventId}:${seat.id}`, status: seat.status === 'killed' ? 'killed' : 'open' });
        }
        if (rows.length) await tx.seatInventory.createMany({ data: rows });
        await transition(tx, 'event', eventId, 'hold', 'announced', actor); return { id: eventId, status: 'announced' };
      }
      if (operation === 'setProductionHold') {
        await expireHolds(tx, eventId);
        const level = await tx.priceLevel.findUnique({ where: { id: input.levelId }, include: { sections: true } });
        const ids = input.seatInventoryIds || [];
        const qty = ids.length || input.quantity;
        if (!level || level.eventId !== eventId || !Number.isInteger(qty) || qty < 1 || level.sold + level.held + level.productionHeld + qty > level.capacity) throw new Error('Insufficient capacity');
        const seats = await tx.seatInventory.findMany({ where: { id: { in: ids }, eventId, priceLevelId: level.id, status: 'open' } });
        if (seats.length !== ids.length || new Set(ids).size !== ids.length) throw new Error('Seats are unavailable');
        for (const section of level.sections) if (section.kind === 'ga') { const siblings = await tx.priceLevel.findMany({where:{eventId,sections:{some:{id:section.id}}}}); if (siblings.reduce((n: number,l: any)=>n+l.sold+l.held+l.productionHeld,0)+qty>section.capacity) throw new Error('Section capacity exhausted'); }
        const row = await tx.productionHold.create({ data: { eventId, priceLevelId: level.id, quantity: qty, holdType: input.holdType || 'production', releaseAt: input.releaseAt ? new Date(input.releaseAt) : null, status: 'active', seats: { connect: ids.map((id: string) => ({ id })) } } });
        await tx.priceLevel.update({ where: { id: level.id }, data: { productionHeld: { increment: qty } } });
        for (const seat of seats) await tx.seatInventory.update({ where: { id: seat.id }, data: { status: 'reserved_hold', occupancyKey: `${eventId}:${seat.seatId}` } });
        await audit('ProductionHold', row.id, { quantity: qty }); return { id: row.id, status: 'active' };
      }
      if (operation === 'releaseProductionHold') {
        const row = await tx.productionHold.findUnique({ where: { id: input.productionHoldId }, include: { seats: true } });
        if (!row || row.status !== 'active') throw new Error('Active production hold required');
        await releaseBlock(tx, row); await audit('ProductionHold', row.id, { status: 'released' }); return { id: row.id, status: 'released' };
      }
      if (operation === 'scanTicket') {
        const ticket = input.token ? await tx.ticket.findFirst({ where: { tokenHash: digest(input.token) } }) : await tx.ticket.findUnique({ where: { ticketCode: input.ticketCode || '' } });
        if (!ticket) throw new Error('Ticket not found');
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error('Event not found');
        let result = ticket.eventId !== eventId ? 'wrong_event' : ['void','refunded','transferred'].includes(ticket.status) ? 'void' : ticket.status === 'checked_in' ? event.allowReentry ? 'reentry' : 'duplicate' : 'admitted';
        if (result === 'admitted' && !['doors','in_progress'].includes(event.status)) throw new Error('Doors are not open');
        if (result === 'admitted') await transition(tx, 'ticket', ticket.id, 'valid', 'checked_in', actor);
        const scan = await tx.scanEvent.create({ data: { ticketId: ticket.id, eventId, gate: input.gate || 'Main', scannedById: actor, at: new Date(), result } });
        return { id: scan.id, result, admitted: await tx.ticket.count({ where: { eventId, status: 'checked_in' } }) };
      }
      if (operation === 'recordMerchSales') {
        const deal = await tx.offer.findFirst({ where: { eventId, status: { in: ['accepted','contracted','settled'] } } });
        if (!deal) throw new Error('Accepted deal required');
        const terms = deal.acceptedTerms;
        if (!terms || canonicalDigest((terms)) !== deal.acceptedTermsHash) throw new Error('Accepted terms hash mismatch');
        for (const k of ['softGrossCents','hardGrossCents','sellerFeeCents']) if (!Number.isSafeInteger(input[k] || 0) || (input[k] || 0) < 0) throw new Error('Invalid merch amount');
        if (await tx.settlement.count({ where: { eventId, status: { in: ['signed_promoter','signed_artist','final'] } } })) throw new Error('Settlement is frozen');
        const sheet = validateCountMaps(input.countIn, input.countOut);
        const existing = await tx.merchSales.findFirst({ where: { eventId } });
        const data = { eventId, softGrossCents: input.softGrossCents, hardGrossCents: input.hardGrossCents, sellerFeeCents: input.sellerFeeCents || 0, venueSoftSplitBps: terms.merchSplitBps, venueHardSplitBps: terms.hardMerchSplitBps, venueShareCents: percentage(input.softGrossCents, terms.merchSplitBps).cents + percentage(input.hardGrossCents, terms.hardMerchSplitBps).cents, countIn: sheet ? input.countIn : undefined, countOut: sheet ? input.countOut : undefined };
        const row = existing ? await tx.merchSales.update({ where: { id: existing.id }, data }) : await tx.merchSales.create({ data });
        await audit('MerchSales', row.id, data); return { id: row.id, venueShareCents: row.venueShareCents };
      }
      if (operation === 'computeSettlement') return buildSettlement(tx, eventId, actor);
      if (operation === 'adjustSettlement') {
        if (!input.reason || !Number.isSafeInteger(input.amountCents)) throw new Error('Adjustment cents and reason required');
        await validateApprover(tx, input.approvedById, actor);
        const old = await tx.settlement.findUnique({ where: { id: input.settlementId }, include: { settlementLine_settlement: true } });
        if (!old) throw new Error('Settlement not found');
        const { id, createdAt, updatedAt, settlementLine_settlement: lines, ...data } = old;
        const snapshot = { ...old.computedSnapshot, correction: { previousHash: old.hash, reason: input.reason, amountCents: input.amountCents, approvedById: input.approvedById } };
        const row = await tx.settlement.create({ data: { ...data, version: old.version + 1, previousVersionId: old.id, status: 'draft', approvals: {}, computedSnapshot: snapshot, hash: canonicalDigest((snapshot)), artistTotalCents: old.artistTotalCents + input.amountCents, balanceDueArtistCents: old.balanceDueArtistCents + input.amountCents, promoterNetCents: old.promoterNetCents - input.amountCents } });
        for (const line of lines) { const { id, createdAt, updatedAt, settlementId, ...copy } = line; await tx.settlementLine.create({ data: { ...copy, settlementId: row.id } }); }
        await tx.settlementLine.create({ data: { settlementId: row.id, kind: 'adjustment', label: input.reason, amountCents: input.amountCents, reason: input.reason, approvedById: input.approvedById, sourceRef: old.id } });
        await audit('Settlement', row.id, { hash: row.hash }, input.reason); return { id: row.id, status: 'draft', hash: row.hash };
      }
      if (operation === 'signSettlement') {
        const row = await tx.settlement.findUnique({ where: { id: input.settlementId } });
        if (!row || canonicalDigest((row.computedSnapshot)) !== row.hash) throw new Error('Settlement snapshot hash mismatch');
        const transitions: Record<string,string> = { draft: 'reviewed', reviewed: 'signed_promoter', signed_promoter: 'signed_artist', signed_artist: 'final' };
        const next = transitions[row.status]; if (!next) throw new Error('Settlement cannot be signed');
        if (next === 'signed_artist' && row.approvals?.signed_promoter?.actorId === actor) throw new Error('Artist signature requires a different user');
        await transition(tx, 'settlement', row.id, row.status, next, actor, '', { approvals: { ...row.approvals, [next]: { actorId: actor, at: new Date().toISOString(), hash: row.hash } } });
        return { id: row.id, status: next, hash: row.hash };
      }
      if (operation === 'recordArtistPayment') {
        const settlement = await tx.settlement.findUnique({ where: { id: input.settlementId } });
        if (!settlement) throw new Error('Settlement not found');
        const row = await applyArtistPayment(tx, settlement, { kind: input.kind, amountCents: input.amountCents, status: input.status === 'scheduled' ? 'scheduled' : 'paid', method: input.method || 'recorded', reference: input.reference }, actor);
        return { id: row.id, status: row.status };
      }
      if (operation === 'postponeEvent' || operation === 'cancelEvent') {
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event || ['cancelled','settled'].includes(event.status)) throw new Error('Event cannot transition');
        const next = operation === 'postponeEvent' ? 'postponed' : 'cancelled';
        // Cancellation must complete provider refunds via refundTicketOrder; never attest money locally.
        if (next === 'cancelled' && await tx.ticketOrder.count({ where: { eventId, status: { in: ['paid','partially_refunded'] } } })) throw new Error('Refund all paid orders before cancelling');
        if (next === 'cancelled') await expireHolds(tx, eventId, { all: true });
        await transition(tx, 'event', eventId, event.status, next, actor, input.reason || '', next === 'postponed' ? { refundWindowEndsAt: new Date(Date.now()+30*86400000) } : {});
        return { id: eventId, status: next };
      }
      throw new Error('Unknown operator command');
    });
  };
}
/** One path for every artist payment: a balance payment can never exceed what is due, and clears it exactly. */
export async function applyArtistPayment(tx: any, settlement: any, p: { kind: string; amountCents: number; status: string; method: string; reference: string }, actor: string | null) {
  if (!Number.isSafeInteger(p.amountCents) || p.amountCents < 1 || !['deposit', 'balance'].includes(p.kind) || !p.reference) throw new Error('Valid payment kind, amount and reference required');
  const row = await tx.artistPayment.create({ data: { settlementId: settlement.id, kind: p.kind, amountCents: p.amountCents, status: p.status, method: p.method, reference: p.reference } });
  if (p.kind === 'balance' && p.status === 'paid') {
    if (settlement.status !== 'final') throw new Error('Final settlement required');
    if (p.amountCents > settlement.balanceDueArtistCents) throw new Error('Payment exceeds the balance due');
    const remaining = settlement.balanceDueArtistCents - p.amountCents;
    await tx.settlement.update({ where: { id: settlement.id }, data: { balanceDueArtistCents: remaining } });
    await tx.settlementLine.create({ data: { settlementId: settlement.id, kind: 'payment', label: `Balance payment ${p.reference}`, amountCents: -p.amountCents, sourceRef: row.id } });
    if (remaining === 0) {
      const event = await tx.event.findUnique({ where: { id: settlement.eventId } });
      if (event.status !== 'settled') await transition(tx, 'event', event.id, event.status, 'settled', actor, 'Balance paid in full');
      await tx.offer.updateMany({ where: { eventId: event.id, status: { in: ['accepted', 'contracted'] } }, data: { status: 'settled' } });
    }
  }
  await appendAuditEvent(tx, actor, { action: 'artistPayment.recorded', targetList: 'ArtistPayment', targetId: row.id, after: { kind: p.kind, amountCents: p.amountCents, reference: p.reference } });
  return row;
}
export function termsOf(offer: any) {
  return Object.fromEntries(['dealType','guaranteeCents','percentageBps','breakevenBasis','promoterProfitBps','expenseCapCents','merchSplitBps','hardMerchSplitBps','radiusClause','hospitalityRiderCents','depositCents','depositDueAt','version'].map(k => [k, offer[k] instanceof Date ? offer[k].toISOString() : offer[k]]));
}
export async function validateApprover(tx: any, id: string, actor: string) {
  if (!id || id === actor) throw new Error('A different manager must approve');
  const user = await tx.user.findUnique({ where: { id }, include: { role: true } });
  if (!user?.role?.canApproveAdjustments) throw new Error('Approver lacks manager permission');
}
export async function buildSettlement(tx: any, eventId: string, actor: string) {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event || !['completed','settling'].includes(event.status)) throw new Error('Completed event required');
  const old = await tx.settlement.findFirst({ where: { eventId }, orderBy: { version: 'desc' } });
  if (old && ['signed_promoter','signed_artist','final'].includes(old.status)) throw new Error('Signed settlement is frozen; create an approved adjustment');
  const offers = await tx.offer.findMany({ where: { eventId, status: { in: ['accepted','contracted','settled'] } }, orderBy: { id: 'asc' } });
  if (!offers.length) throw new Error('Accepted artist deal required');
  const orders = await tx.ticketOrder.findMany({ where: { eventId, status: { in: ['paid','partially_refunded','comp'] } }, include: { ticketOrderLine_order: true } });
  const expenses = await tx.eventExpense.findMany({ where: { eventId } });
  const merch = await tx.merchSales.findFirst({ where: { eventId } });
  const payments = await tx.artistPayment.findMany({ where: { status: 'paid', settlement: { eventId } } });
  const gross = orders.reduce((n: number,o: any)=>n+o.totalCents-o.refundedCents,0);
  const tax = orders.reduce((n: number,o: any)=>n+o.taxCents,0);
  const fees = orders.reduce((n: number,o: any)=>n+o.serviceFeesCents+o.facilityFeesCents,0);
  const capped = expenses.filter((e: any)=>e.isCapped).reduce((n: number,e: any)=>n+e.actualCents,0);
  const uncapped = expenses.filter((e: any)=>!e.isCapped).reduce((n: number,e: any)=>n+e.actualCents,0);
  const depositsPaidCents = payments.filter((p: any)=>p.kind==='deposit').reduce((n: number,p: any)=>n+p.amountCents,0);
  const figures = offers.map((offer: any,index: number) => {
    const terms = offer.acceptedTerms;
    if (!terms || canonicalDigest((terms))!==offer.acceptedTermsHash) throw new Error('Accepted deal terms hash mismatch');
    const input = { grossCents: gross, taxCents: tax, passthroughFeesCents: fees, cappedExpensesCents: capped, uncappedExpensesCents: uncapped, expenseCapCents: terms.expenseCapCents, guaranteeCents: terms.guaranteeCents, percentageBps: terms.percentageBps, promoterProfitBps: terms.promoterProfitBps, depositsPaidCents: index===0?depositsPaidCents:0, dealType: terms.dealType, merchSoftCents: index===0?merch?.softGrossCents||0:0, merchHardCents: index===0?merch?.hardGrossCents||0:0, merchSplitBps: terms.merchSplitBps, hardMerchSplitBps: terms.hardMerchSplitBps };
    return { offerId: offer.id, artistId: offer.artistId, acceptedTermsHash: offer.acceptedTermsHash, input, result: calculate(input) };
  });
  const sum = (key: string) => figures.reduce((n: number,x: any)=>n+x.result[key],0);
  const { rounding, ...first } = figures[0].result;
  const totals = { ...first, artistGuaranteeCents: sum('artistGuaranteeCents'), artistOverageCents: sum('artistOverageCents'), artistTotalCents: sum('artistTotalCents'), balanceDueArtistCents: sum('balanceDueArtistCents'), promoterNetCents: first.netBoxOfficeCents-first.totalExpensesCents-sum('artistTotalCents')+sum('merchVenueShareCents') };
  const snapshot = { version: 1, eventId, figures, orderIds: orders.map((o: any)=>o.id), expenses: expenses.map((e: any)=>({id:e.id,actualCents:e.actualCents,isCapped:e.isCapped})), totals };
  const hash = canonicalDigest((snapshot));
  const data = { eventId, status: 'draft', version: old ? old.version+1 : 1, previousVersionId: old?.id, ticketGrossCents: gross, ticketFeesCents: fees, taxCents: tax, paidCount: orders.filter((o: any)=>o.status!=='comp').reduce((n: number,o: any)=>n+o.ticketOrderLine_order.reduce((a: number,l: any)=>a+l.quantity,0),0), compCount: orders.filter((o: any)=>o.status==='comp').length, ...totals, computedSnapshot: snapshot, hash };
  const settlement = await tx.settlement.create({ data });
  if (old && ['draft','reviewed'].includes(old.status)) await transition(tx, 'settlement', old.id, old.status, 'void', actor, 'Superseded by recomputation');
  const lines: [string, number, string][] = [['Ticket gross', gross, 'gross'], ['Pass-through fees', -fees, 'fee'], ['Tax', -tax, 'tax'], ['Counted expenses', -totals.totalExpensesCents, 'expense'], ['Artist guarantee', totals.artistGuaranteeCents, 'guarantee'], ['Artist overage', totals.artistOverageCents, 'overage'], ['Deposits paid', -depositsPaidCents, 'deposit']];
  for (const [label, amountCents, kind] of lines) await tx.settlementLine.create({ data: { settlementId: settlement.id, label, amountCents, kind, sourceRef: eventId } });
  // Invariant: the artist-side lines add up to the balance due.
  if (totals.artistGuaranteeCents + totals.artistOverageCents - depositsPaidCents !== totals.balanceDueArtistCents) throw new Error('Settlement lines do not reconcile to the balance due');
  for (const figure of figures) for (const rem of figure.result.rounding) await tx.settlementLine.create({ data: { settlementId:settlement.id, kind:'rounding',label:rem.label,amountCents:0,roundingRemainder:rem.numerator,sourceRef:figure.offerId } });
  if (event.status === 'completed') await transition(tx, 'event', eventId, 'completed', 'settling', actor, 'Settlement computed');
  await appendAuditEvent(tx,actor,{ action:'settlement.computed',targetList:'Settlement',targetId:settlement.id,after:{hash} });
  return { id:settlement.id,status:'draft',hash,...totals };
}
export const operatorNames = Object.keys(required);
