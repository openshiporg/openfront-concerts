import { authorize, termsOf } from './operators';
import type { Permission } from '../access';
import { command, transition } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { expireHolds } from './inventory';
import { PRICING_OPEN, LEVEL_STATUSES, FROZEN_SETTLEMENT, LIVE_OFFER, REVISABLE, validateLevel, validatePhase, validateExpense, validateTerms, cents } from '../lib/editors';

/**
 * Operator editors for settlement inputs: price levels and phases, expenses, offer drafts and versions, deposits.
 * Each resolves its event first, then runs under the same `event:` advisory lock the sale paths use,
 * with idempotency, explicit state checks and an audit row in the same transaction.
 */
type Run = (tx: any, ctx: { input: any; data: any; eventId: string; actor: string; audit: (list: string, id: string, before: any, after: any, reason?: string) => Promise<any> }) => Promise<any>;

async function eventOf(prisma: any, input: any): Promise<string> {
  if (input.levelId) { const r = await prisma.priceLevel.findUnique({ where: { id: input.levelId } }); if (!r?.eventId) throw new Error('Price level not found'); return r.eventId; }
  if (input.phaseId) { const r = await prisma.priceLevelPhase.findUnique({ where: { id: input.phaseId }, include: { priceLevel: true } }); if (!r?.priceLevel?.eventId) throw new Error('Phase not found'); return r.priceLevel.eventId; }
  if (input.expenseId) { const r = await prisma.eventExpense.findUnique({ where: { id: input.expenseId } }); if (!r?.eventId) throw new Error('Expense not found'); return r.eventId; }
  if (input.offerId) { const r = await prisma.offer.findUnique({ where: { id: input.offerId } }); if (!r?.eventId) throw new Error('Offer not found'); return r.eventId; }
  if (!input.eventId) throw new Error('Event required');
  return input.eventId;
}

function editor(operation: string, permission: Permission, run: Run) {
  return async (_: any, { input }: any, context: any) => {
    authorize(context, permission);
    if (!input?.idempotencyKey) throw new Error('Idempotency key required');
    const actor = context.session.itemId;
    const eventId = await eventOf(context.prisma, input);
    const data = input.data || {};
    return command(context, { operation, idempotencyKey: input.idempotencyKey, lock: `event:${eventId}`, params: { ...input, eventId } }, async tx => {
      const audit = (list: string, id: string, before: any, after: any, reason = '') => appendAuditEvent(tx, actor, { action: operation, targetList: list, targetId: id, before, after, reason });
      return run(tx, { input, data, eventId, actor, audit });
    });
  };
}

async function openEvent(tx: any, eventId: string) {
  const event = await tx.event.findUnique({ where: { id: eventId }, include: { seatingChart: { include: { chartSection_chart: true } } } });
  if (!event) throw new Error('Event not found');
  if (!PRICING_OPEN.includes(event.status)) throw new Error(`Pricing is closed once the event is ${event.status.replace(/_/g, ' ')}`);
  return event;
}

export const savePriceLevel = editor('savePriceLevel', 'canManageEvents', async (tx, { input, data, eventId, audit }) => {
  const event = await openEvent(tx, eventId);
  await expireHolds(tx, eventId);
  const existing = input.levelId ? await tx.priceLevel.findUnique({ where: { id: input.levelId }, include: { sections: true } }) : null;
  if (existing?.status === 'closed') throw new Error('A closed level cannot be edited');
  const level = validateLevel(data, existing || undefined);
  const chartSections = event.seatingChart?.chartSection_chart || [];
  const wanted: string[] = Array.isArray(data.sectionIds) ? [...new Set<string>(data.sectionIds)] : existing ? existing.sections.map((s: any) => s.id) : [];
  if (!wanted.length) throw new Error('Choose at least one section');
  const sections = wanted.map(id => chartSections.find((s: any) => s.id === id));
  if (sections.some(s => !s)) throw new Error('Sections must belong to the event chart');
  const before = existing ? [...existing.sections.map((s: any) => s.id)].sort().join(',') : '';
  const sectionsChanged = before !== [...wanted].sort().join(',');
  // Seat inventory is generated from levels when the event publishes; after that, reserved assignments are fixed.
  if (event.status !== 'hold' && sectionsChanged && (existing?.sections.some((s: any) => s.kind === 'reserved') || sections.some((s: any) => s.kind === 'reserved'))) throw new Error('Reserved seat assignments are fixed after publishing; add a general admission level instead');
  if (existing && existing.sold + existing.held > 0 && sectionsChanged) throw new Error('Sections cannot change once tickets are sold or held');
  // Reserved levels sell seats; capacity is the seat count, not an editable number.
  if (sections.some((s: any) => s.kind === 'reserved') && sections.some((s: any) => s.kind === 'ga')) throw new Error('A level is either general admission or reserved, not both');
  const room = (sections as any[]).reduce((n, s) => n + (s.capacity || 0), 0);
  if (level.capacity > room) throw new Error(`Capacity exceeds the chosen sections (${room})`);
  const payload = { ...level, sections: { set: wanted.map(id => ({ id })) } };
  const row = existing
    ? await tx.priceLevel.update({ where: { id: existing.id }, data: payload })
    : await tx.priceLevel.create({ data: { ...level, eventId, status: 'active', currencyCode: 'USD', sections: { connect: wanted.map(id => ({ id })) } } });
  await audit('PriceLevel', row.id, existing ? { name: existing.name, priceCents: existing.priceCents, feeCents: existing.feeCents, facilityFeeCents: existing.facilityFeeCents, capacity: existing.capacity, perOrderLimit: existing.perOrderLimit, sections: before } : null, { ...level, sections: wanted.join(',') });
  return { id: row.id };
});

export const setPriceLevelStatus = editor('setPriceLevelStatus', 'canManageEvents', async (tx, { input, data, eventId, actor }) => {
  await openEvent(tx, eventId);
  const level = await tx.priceLevel.findUnique({ where: { id: input.levelId } });
  if (!LEVEL_STATUSES.includes(data.status)) throw new Error('Unknown level status');
  if (level.status === data.status) throw new Error(`Level is already ${data.status}`);
  if (level.status === 'closed') throw new Error('A closed level stays closed; add a new level');
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (data.status !== 'active' && ['presale', 'on_sale'].includes(event.status) && await tx.priceLevel.count({ where: { eventId, status: 'active', id: { not: level.id } } }) === 0) throw new Error('Keep one active level while sales are open, or mark the event sold out');
  await transition(tx, 'priceLevel', level.id, level.status, data.status, actor, String(data.reason || ''));
  return { id: level.id, status: data.status };
});

export const savePricePhase = editor('savePricePhase', 'canManageEvents', async (tx, { input, data, eventId, audit }) => {
  await openEvent(tx, eventId);
  await expireHolds(tx, eventId);
  const existing = input.phaseId ? await tx.priceLevelPhase.findUnique({ where: { id: input.phaseId } }) : null;
  const levelId = existing?.priceLevelId || input.levelId;
  const level = await tx.priceLevel.findUnique({ where: { id: levelId } });
  if (!level || level.eventId !== eventId) throw new Error('Price level not found');
  const reserved = existing ? (await tx.inventoryHold.aggregate({ where: { phaseId: existing.id, status: 'active' }, _sum: { quantity: true } }))._sum.quantity || 0 : 0;
  const phase = validatePhase(data, { sold: existing?.sold || 0, reserved });
  if (existing && existing.sold > 0 && phase.priceCents !== existing.priceCents) throw new Error('Price is fixed once a phase has sales; add a new phase');
  const siblings = await tx.priceLevelPhase.findMany({ where: { priceLevelId: level.id, id: existing ? { not: existing.id } : undefined } });
  if (siblings.some((p: any) => p.name.toLowerCase() === phase.name.toLowerCase())) throw new Error(`Phase ${phase.name} already exists`);
  if (siblings.reduce((n: number, p: any) => n + p.quantity, 0) + phase.quantity > level.capacity) throw new Error(`Phase quantities exceed level capacity (${level.capacity})`);
  const row = existing
    ? await tx.priceLevelPhase.update({ where: { id: existing.id }, data: phase })
    : await tx.priceLevelPhase.create({ data: { ...phase, startsAt: phase.startsAt || new Date(), priceLevelId: level.id, currencyCode: level.currencyCode } });
  await audit('PriceLevelPhase', row.id, existing ? { name: existing.name, priceCents: existing.priceCents, quantity: existing.quantity, sort: existing.sort } : null, { ...phase, levelId: level.id });
  return { id: row.id };
});

async function settlementOpen(tx: any, eventId: string) {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');
  if (['cancelled', 'settled'].includes(event.status)) throw new Error(`Event is ${event.status}`);
  if (await tx.settlement.count({ where: { eventId, status: { in: FROZEN_SETTLEMENT } } })) throw new Error('Settlement is signed; correct it with an approved adjustment');
  return event;
}

export const saveExpense = editor('saveExpense', 'canManageSettlements', async (tx, { input, data, eventId, audit }) => {
  await settlementOpen(tx, eventId);
  const existing = input.expenseId ? await tx.eventExpense.findUnique({ where: { id: input.expenseId } }) : null;
  const expense = validateExpense(data);
  const row = existing ? await tx.eventExpense.update({ where: { id: existing.id }, data: expense }) : await tx.eventExpense.create({ data: { ...expense, eventId } });
  await audit('EventExpense', row.id, existing ? { category: existing.category, vendor: existing.vendor, budgetCents: existing.budgetCents, actualCents: existing.actualCents, isCapped: existing.isCapped } : null, expense);
  return { id: row.id };
});

async function ensureBilling(tx: any, eventId: string, artistId: string, billing: string) {
  const found = await tx.eventArtist.findFirst({ where: { eventId, artistId } });
  if (found) return found;
  if (!['headliner', 'co_headliner', 'support', 'opener'].includes(billing)) throw new Error('Unknown billing');
  const last = await tx.eventArtist.findFirst({ where: { eventId }, orderBy: { position: 'desc' } });
  return tx.eventArtist.create({ data: { eventId, artistId, billing, position: (last?.position || 0) + 1 } });
}

export const draftOffer = editor('draftOffer', 'canManageDeals', async (tx, { input, data, eventId, audit }) => {
  const event = await tx.event.findUnique({ where: { id: eventId } });
  if (!event || ['completed', 'settling', 'settled', 'cancelled'].includes(event.status)) throw new Error('Offers can be drafted until the show is over');
  const artist = input.artistId ? await tx.artist.findUnique({ where: { id: input.artistId } }) : null;
  if (!artist) throw new Error('Artist required');
  if (await tx.offer.count({ where: { eventId, artistId: artist.id, status: { in: LIVE_OFFER } } })) throw new Error(`${artist.name} already has a live offer for this event; revise it instead`);
  const terms = validateTerms(data);
  const billing = await ensureBilling(tx, eventId, artist.id, data.billing || 'support');
  const row = await tx.offer.create({ data: { ...terms, eventId, artistId: artist.id, eventArtistId: billing.id, version: 1, status: 'draft', currencyCode: 'USD' } });
  await audit('Offer', row.id, null, { ...terms, version: 1 });
  return { id: row.id, status: 'draft', version: 1 };
});

export const updateDraftOffer = editor('updateDraftOffer', 'canManageDeals', async (tx, { input, data, audit }) => {
  const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
  if (offer.status !== 'draft') throw new Error('Only a draft can be edited; revise a sent or accepted offer');
  const terms = validateTerms(data);
  const updated = await tx.offer.updateMany({ where: { id: offer.id, status: 'draft' }, data: terms });
  if (updated.count !== 1) throw new Error('Offer changed; reload');
  await audit('Offer', offer.id, termsOf(offer), terms);
  return { id: offer.id, status: 'draft', version: offer.version };
});

/** New terms become a new draft version. The replaced offer leaves the deal (superseded), so settlement only sees the live version. */
export const reviseOffer = editor('reviseOffer', 'canManageDeals', async (tx, { input, data, eventId, actor, audit }) => {
  const offer = await tx.offer.findUnique({ where: { id: input.offerId } });
  if (!REVISABLE.includes(offer.status)) throw new Error(offer.status === 'draft' ? 'Edit the draft instead' : 'Contracted and settled terms are binding; correct them through a settlement adjustment');
  const reason = String(data.reason || '').trim();
  if (!reason) throw new Error('Revision reason required');
  if (await tx.offer.count({ where: { eventId, artistId: offer.artistId, status: 'draft' } })) throw new Error('A draft version already exists');
  if (await tx.settlement.count({ where: { eventId, status: { in: FROZEN_SETTLEMENT } } })) throw new Error('Settlement is signed; correct it with an approved adjustment');
  const terms = validateTerms(data);
  const latest = await tx.offer.findFirst({ where: { eventId, artistId: offer.artistId }, orderBy: { version: 'desc' } });
  const version = (latest?.version || offer.version) + 1;
  const row = await tx.offer.create({ data: { ...terms, eventId, artistId: offer.artistId, eventArtistId: offer.eventArtistId, version, status: 'draft', currencyCode: offer.currencyCode } });
  if (offer.status !== 'declined') await transition(tx, 'offer', offer.id, offer.status, 'superseded', actor, reason, { notes: [offer.notes, `Superseded by version ${version}`].filter(Boolean).join('\n') });
  await audit('Offer', row.id, { previousOfferId: offer.id, version: offer.version }, { ...terms, version }, reason);
  return { id: row.id, status: 'draft', version, previousOfferId: offer.id };
});

/** Deposit to the artist before settlement. Held on the event's deposit holder (void v0), as the seed does; computeSettlement counts it. */
export const recordArtistDeposit = editor('recordArtistDeposit', 'canManageSettlements', async (tx, { data, eventId, actor }) => {
  await settlementOpen(tx, eventId);
  const amountCents = cents(data.amountCents, 'Deposit', { min: 1 });
  const reference = String(data.reference || '').trim();
  if (reference.length < 3) throw new Error('Payment reference required');
  const method = ['wire', 'ach', 'check', 'cash'].includes(data.method) ? data.method : null;
  if (!method) throw new Error('Choose wire, ACH, check or cash');
  const offers = await tx.offer.findMany({ where: { eventId, status: { in: ['accepted', 'contracted'] } } });
  if (!offers.length) throw new Error('Accepted or contracted deal required');
  const agreed = offers.reduce((n: number, o: any) => n + (o.acceptedTerms?.depositCents || 0), 0);
  const paid = (await tx.artistPayment.aggregate({ where: { kind: 'deposit', status: 'paid', settlement: { eventId } }, _sum: { amountCents: true } }))._sum.amountCents || 0;
  if (paid + amountCents > agreed) throw new Error(`Deposit exceeds the agreed deposit ($${((agreed - paid) / 100).toFixed(2)} left)`);
  if (await tx.artistPayment.count({ where: { reference, settlement: { eventId } } })) throw new Error('Reference already recorded');
  let holder = await tx.settlement.findFirst({ where: { eventId, version: 0, hash: 'deposit-holder' } });
  if (!holder) holder = await tx.settlement.create({ data: { eventId, status: 'void', version: 0, hash: 'deposit-holder', computedSnapshot: {} } });
  const row = await tx.artistPayment.create({ data: { settlementId: holder.id, kind: 'deposit', amountCents, status: 'paid', method, reference } });
  await appendAuditEvent(tx, actor, { action: 'artistPayment.deposit', targetList: 'ArtistPayment', targetId: row.id, after: { amountCents, method, reference } });
  return { id: row.id, status: 'paid', depositsPaidCents: paid + amountCents, agreedCents: agreed };
});

export const editorMutations = { savePriceLevel, setPriceLevelStatus, savePricePhase, saveExpense, draftOffer, updateDraftOffer, reviseOffer, recordArtistDeposit };
