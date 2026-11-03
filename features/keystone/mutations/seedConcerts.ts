import { randomUUID } from 'node:crypto';
import { permissions, permissionNames } from '../access';
import { checkedClient, lockTransactionKey } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { canonicalDigest, digest, humanCode, opaqueToken } from '../lib/guest-proof';
import { ticketQuote, percentage } from '../lib/settlement';
import { buildSettlement, termsOf, applyArtistPayment } from './operators';

const DAY = 86400000;
const at = (days: number, hour = 20) => { const d = new Date(Date.now() + days * DAY); d.setUTCHours(hour, 0, 0, 0); return d; };

/** Onboarding setup. Each call is one ordered, rerunnable phase; records are matched by name. */
export default async function seedConcerts(_: any, { section, data }: { section: string; data: any }, context: any) {
  if (!permissions.canManageOnboarding({ session: context.session })) throw new Error('Permission required: canManageOnboarding');
  const actor = context.session.itemId;
  return context.prisma.$transaction(async (raw: any) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, 'onboarding:concerts');
    const one = async (model: string, where: any, create: any) => (await tx[model].findFirst({ where })) || tx[model].create({ data: create });
    if (section === 'settings') {
      const row = await one('storeSettings', {}, { name: data.name, currencyCode: data.currencyCode, refundApprovalThresholdCents: data.refundApprovalThresholdCents });
      return { id: row.id };
    }
    if (section === 'role') {
      const flags = Object.fromEntries(permissionNames.map(n => [n, data.all ? true : (data.permissions || []).includes(n)]));
      const row = await one('role', { name: data.name }, { name: data.name, ...flags });
      return { id: row.id };
    }
    if (section === 'venue') {
      const venue = await one('venue', { name: data.name }, { name: data.name, city: data.city, timezone: data.timezone, address: data.address, contact: data.contact, capacity: data.capacity, ownedByPromoter: data.ownedByPromoter, taxBps: data.taxBps, defaultFacilityFeeCents: data.defaultFacilityFeeCents, rentTermsDefault: { rentBasis: 'flat' } });
      if (await tx.seatingChart.findFirst({ where: { venueId: venue.id, name: data.chart.name } })) return { id: venue.id };
      const chart = await tx.seatingChart.create({ data: { venueId: venue.id, name: data.chart.name, version: 1, status: 'draft' } });
      let sort = 0;
      for (const s of data.chart.sections) {
        const reserved = s.kind === 'reserved';
        const section = await tx.chartSection.create({ data: { chartId: chart.id, name: s.name, kind: s.kind, sort: sort++, capacity: reserved ? s.rows * s.seatsPerRow : s.capacity } });
        if (!reserved) continue;
        const seats: any[] = [];
        for (let r = 0; r < s.rows; r++) for (let n = 1; n <= s.seatsPerRow; n++) {
          const row = String.fromCharCode(65 + (r % 26)) + (r >= 26 ? String(Math.floor(r / 26)) : '');
          const killed = r === 0 && n === 1 && s.name === 'Orchestra';
          seats.push({ chartSectionId: section.id, row, number: String(n), label: `${s.name.slice(0, 4).toUpperCase()} ${row}-${n}`, x: n, y: r, accessible: n <= 2 && r === s.rows - 1, companion: n === 3 && r === s.rows - 1, obstructed: false, status: killed ? 'killed' : 'sellable' });
        }
        await tx.seat.createMany({ data: seats });
      }
      await tx.seatingChart.update({ where: { id: chart.id }, data: { status: 'published' } });
      return { id: venue.id };
    }
    if (section === 'agency') { const row = await one('agency', { name: data.name }, { name: data.name, contacts: data.contacts }); return { id: row.id }; }
    if (section === 'artist') {
      const agency = await tx.agency.findFirst({ where: { name: data.agency } });
      const row = await one('artist', { name: data.name }, { name: data.name, genreTags: data.genreTags, agentName: data.agentName, agentEmail: data.agentEmail, agencyId: agency?.id });
      return { id: row.id };
    }
    if (section === 'tour') {
      const artist = await tx.artist.findFirst({ where: { name: data.artist } });
      const row = await one('tour', { name: data.name }, { name: data.name, artistId: artist.id, startAt: at(data.startDays), endAt: at(data.endDays) });
      return { id: row.id };
    }
    if (section === 'promo') {
      const event = data.eventTitle ? await tx.event.findFirst({ where: { title: data.eventTitle } }) : null;
      const row = await one('promoCode', { code: data.code }, { code: data.code, discountType: data.discountType, value: data.value, maxUses: data.maxUses, status: 'active', eventId: event?.id });
      return { id: row.id };
    }
    if (section === 'provider') {
      const row = await one('paymentProvider', { code: data.code }, { name: data.name, code: data.code, isInstalled: true, createPaymentFunction: 'stripe', capturePaymentFunction: 'stripe', refundPaymentFunction: 'stripe', getPaymentStatusFunction: 'stripe', generatePaymentLinkFunction: 'stripe', handleWebhookFunction: 'stripe' });
      return { id: row.id };
    }
    if (section === 'event') return seedEvent(tx, data, actor);
    if (section === 'dateHold') {
      const venue = await tx.venue.findFirst({ where: { name: data.venue } });
      const artist = await tx.artist.findFirst({ where: { name: data.artist } });
      const date = at(data.days, 0);
      const rankKey = `${venue.id}:${date.toISOString().slice(0, 10)}:${data.rank}`;
      const existing = await tx.dateHold.findUnique({ where: { rankKey } });
      if (existing) return { id: existing.id };
      const event = data.confirmedTitle ? await tx.event.findFirst({ where: { title: data.confirmedTitle } }) : null;
      const row = await tx.dateHold.create({ data: { venueId: venue.id, artistId: artist?.id, date, rank: data.rank, rankKey, status: event ? 'confirmed' : data.rank > 1 ? 'challenged' : 'held', expiresAt: at(14), eventId: event?.id } });
      return { id: row.id };
    }
    throw new Error('Unknown setup section');
  }, { timeout: 120000 });
}

async function seedEvent(tx: any, e: any, actor: string) {
  const existing = await tx.event.findFirst({ where: { title: e.title } });
  if (existing) return { id: existing.id };
  const venue = await tx.venue.findFirst({ where: { name: e.venue } });
  const chart = await tx.seatingChart.findFirst({ where: { venueId: venue.id, name: e.chart }, include: { chartSection_chart: true } });
  const tour = e.tour ? await tx.tour.findFirst({ where: { name: e.tour } }) : null;
  const showAt = at(e.showDays), past = e.showDays < 0;
  const event = await tx.event.create({ data: { title: e.title, venueId: venue.id, seatingChartId: chart.id, tourId: tour?.id, promoterId: actor, doorsAt: new Date(+showAt - 3600000), showAt, curfewAt: new Date(+showAt + 3 * 3600000), ageRestriction: e.ageRestriction || 'all_ages', status: 'hold', announceAt: at(e.showDays - 60), onSaleAt: e.status === 'presale' ? at(7) : at(e.showDays - 55), presaleAt: e.presaleCode ? at(-3) : null, presaleCode: e.presaleCode || '', allowReentry: false, description: e.origin || '' } });
  const sectionByName = new Map<string, any>(chart.chartSection_chart.map((s: any) => [s.name, s]));
  const levels: any[] = [];
  for (const l of e.levels) {
    const level = await tx.priceLevel.create({ data: { eventId: event.id, name: l.name, priceCents: l.priceCents, feeCents: l.feeCents, facilityFeeCents: venue.defaultFacilityFeeCents, capacity: l.capacity, status: 'active', perOrderLimit: 8, sections: { connect: l.sections.map((n: string) => ({ id: sectionByName.get(n).id })) } } });
    let sort = 0;
    for (const p of l.phases || []) await tx.priceLevelPhase.create({ data: { priceLevelId: level.id, name: p.name, priceCents: p.priceCents, quantity: p.quantity, sort: sort++, startsAt: at(-30) } });
    levels.push({ ...level, sectionNames: l.sections, phases: await tx.priceLevelPhase.findMany({ where: { priceLevelId: level.id }, orderBy: { sort: 'asc' } }) });
  }
  // Seat inventory is generated at publication, exactly as publishEvent does.
  if (e.status !== 'hold') {
    const rows: any[] = [];
    for (const level of levels) for (const name of level.sectionNames) {
      const section = sectionByName.get(name);
      if (section.kind !== 'reserved') continue;
      for (const seat of await tx.seat.findMany({ where: { chartSectionId: section.id }, orderBy: [{ y: 'asc' }, { x: 'asc' }] })) rows.push({ id: randomUUID(), eventId: event.id, seatId: seat.id, priceLevelId: level.id, eventSeatKey: `${event.id}:${seat.id}`, status: seat.status === 'killed' ? 'killed' : 'open' });
    }
    if (rows.length) await tx.seatInventory.createMany({ data: rows });
  }
  const headliner = await tx.artist.findFirst({ where: { name: e.artist } });
  const ea = await tx.eventArtist.create({ data: { eventId: event.id, artistId: headliner.id, billing: 'headliner', position: 1, setMinutes: 90, setTime: new Date(+showAt + 1800000) } });
  let position = 2;
  for (const name of e.support || []) { const a = await tx.artist.findFirst({ where: { name } }); await tx.eventArtist.create({ data: { eventId: event.id, artistId: a.id, billing: 'support', position: position++, setMinutes: 45, setTime: new Date(+showAt - 1800000) } }); }
  // Deal lifecycle by event stage; accepted terms are frozen with a canonical hash.
  const stages = ['contracted', 'accepted', 'sent', 'draft'];
  const index = ['p1', 'p2', 'p3'].includes(e.key) ? -1 : ['p4'].includes(e.key) ? -2 : Number(e.key.slice(1)) % stages.length;
  const offerStatus = index === -1 ? 'settled' : index === -2 ? 'contracted' : e.status === 'hold' ? 'draft' : stages[index];
  const base = { eventId: event.id, artistId: headliner.id, eventArtistId: ea.id, ...e.deal, version: 1, depositDueAt: at(e.showDays - 30), status: offerStatus };
  const offer = await tx.offer.create({ data: base });
  if (['accepted', 'contracted', 'settled'].includes(offerStatus)) { const terms = termsOf(offer); await tx.offer.update({ where: { id: offer.id }, data: { acceptedTerms: terms, acceptedTermsHash: canonicalDigest(terms) } }); }
  for (const x of e.expenses || []) await tx.eventExpense.create({ data: { eventId: event.id, category: x.category, budgetCents: x.budgetCents, actualCents: past || e.past ? x.actualCents : 0, isCapped: x.isCapped, vendor: x.vendor } });
  for (const h of e.productionHolds || []) {
    const level = levels.find(l => l.name === h.level);
    const hold = await tx.productionHold.create({ data: { eventId: event.id, priceLevelId: level.id, quantity: h.quantity, holdType: h.holdType, status: 'active', releaseAt: at(e.showDays - 7) } });
    const open = await tx.seatInventory.findMany({ where: { eventId: event.id, priceLevelId: level.id, status: 'open' }, orderBy: { id: 'asc' }, take: h.quantity });
    for (const s of open) await tx.seatInventory.update({ where: { id: s.id }, data: { status: 'reserved_hold', occupancyKey: `${event.id}:${s.seatId}` } });
    if (open.length) await tx.productionHold.update({ where: { id: hold.id }, data: { seats: { connect: open.map((s: any) => ({ id: s.id })) } } });
    await tx.priceLevel.update({ where: { id: level.id }, data: { productionHeld: { increment: h.quantity } } });
  }
  const target = past ? (e.status === 'postponed' ? 'postponed' : 'completed') : e.status;
  const orderPlan = past ? e.past : ['on_sale', 'presale'].includes(e.status) ? { orders: 6, qty: 2 } : null;
  if (orderPlan && e.status !== 'postponed' || (e.status === 'postponed')) await sell(tx, event, venue, levels, e.status === 'postponed' ? { orders: 5, qty: 2 } : orderPlan, past);
  if (past && e.past) {
    if (e.past.scanned) {
      const tickets = await tx.ticket.findMany({ where: { eventId: event.id } });
      await tx.ticket.updateMany({ where: { eventId: event.id }, data: { status: 'checked_in' } });
      await tx.scanEvent.createMany({ data: tickets.map((t: any, i: number) => ({ ticketId: t.id, eventId: event.id, gate: i % 2 ? 'Gate B' : 'Gate A', scannedById: actor, at: new Date(+showAt - 1800000 + i * 1000), result: 'admitted' })) });
    }
    const terms = offer.acceptedTerms || termsOf(offer);
    await tx.merchSales.create({ data: { eventId: event.id, softGrossCents: e.past.merchSoft, hardGrossCents: e.past.merchHard, sellerFeeCents: 0, venueSoftSplitBps: terms.merchSplitBps, venueHardSplitBps: terms.hardMerchSplitBps, venueShareCents: percentage(e.past.merchSoft, terms.merchSplitBps).cents + percentage(e.past.merchHard, terms.hardMerchSplitBps).cents } });
    if (e.deal.depositCents) {
      const settlementless = await tx.settlement.create({ data: { eventId: event.id, status: 'void', version: 0, hash: 'deposit-holder', computedSnapshot: {} } });
      await tx.artistPayment.create({ data: { settlementId: settlementless.id, kind: 'deposit', amountCents: e.deal.depositCents, status: 'paid', method: 'wire', reference: `DEP-${event.id.slice(-6).toUpperCase()}` } });
    }
    await tx.event.update({ where: { id: event.id }, data: { status: 'completed' } });
    const settlement = await buildSettlement(tx, event.id, actor);
    if (e.past.settlement === 'final') {
      const row = await tx.settlement.findUnique({ where: { id: settlement.id } });
      const sign = (who: string) => ({ actorId: actor, at: new Date().toISOString(), hash: row.hash, who });
      const finalRow = await tx.settlement.update({ where: { id: row.id }, data: { status: 'final', approvals: { signed_promoter: sign('promoter'), signed_artist: sign('artist'), final: sign('final') } } });
      if (finalRow.balanceDueArtistCents > 0) await applyArtistPayment(tx, finalRow, { kind: 'balance', amountCents: finalRow.balanceDueArtistCents, status: 'paid', method: 'wire', reference: `BAL-${event.id.slice(-6).toUpperCase()}` }, actor);
      else await tx.event.update({ where: { id: event.id }, data: { status: 'settled' } });
      await tx.offer.updateMany({ where: { eventId: event.id }, data: { status: 'settled' } });
    }
  }
  await tx.event.update({ where: { id: event.id }, data: { status: e.past ? (e.past.settlement === 'final' ? 'settled' : e.past.settlement ? 'settling' : target) : target, refundWindowEndsAt: e.status === 'postponed' ? at(30) : null } });
  await appendAuditEvent(tx, actor, { action: 'onboarding.event', targetList: 'Event', targetId: event.id, after: { status: e.status } });
  return { id: event.id };
}

async function sell(tx: any, event: any, venue: any, levels: any[], plan: { orders: number; qty: number }, past: boolean) {
  const level = levels[0];
  const phase = level.phases?.[0];
  const unit = phase?.priceCents ?? level.priceCents;
  const seatRows = await tx.seatInventory.findMany({ where: { eventId: event.id, priceLevelId: level.id, status: 'open' }, orderBy: { id: 'asc' }, take: plan.orders * plan.qty });
  const reserved = seatRows.length > 0;
  const orders: any[] = [], lines: any[] = [], tickets: any[] = [];
  let sold = 0, cursor = 0;
  for (let i = 0; i < plan.orders; i++) {
    const quote = ticketQuote({ priceCents: unit, feeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, quantity: plan.qty, taxBps: venue.taxBps });
    const id = randomUUID(), lineId = randomUUID();
    orders.push({ id, orderNumber: humanCode('CN'), guestEmail: `guest${i + 1}@mail.example`, guestName: `Guest ${i + 1}`, secretKey: digest(opaqueToken()), subtotalCents: quote.subtotalCents, serviceFeesCents: quote.serviceFeesCents, facilityFeesCents: quote.facilityFeesCents, taxCents: quote.taxCents, discountCents: 0, totalCents: quote.totalCents, status: 'paid', source: 'box_office', eventId: event.id, currencyCode: 'USD' });
    lines.push({ id: lineId, orderId: id, title: event.title, levelName: level.name, phaseName: phase?.name || '', seatLabel: '', unitPriceCents: unit, serviceFeeCents: level.feeCents, facilityFeeCents: level.facilityFeeCents, taxCents: quote.taxCents, quantity: plan.qty, discountCents: 0, totalCents: quote.totalCents, priceLevelId: level.id, phaseId: phase?.id, currencyCode: 'USD' });
    for (let q = 0; q < plan.qty; q++) {
      const seat = reserved ? seatRows[cursor++] : null;
      tickets.push({ orderId: id, eventId: event.id, lineId, seatInventoryId: seat?.id, ticketCode: humanCode('TK'), tokenHash: digest(opaqueToken()), holderName: `Guest ${i + 1}`, holderEmail: `guest${i + 1}@mail.example`, status: 'valid' });
      sold++;
    }
  }
  if (sold > level.capacity - level.productionHeld) throw new Error('Setup sales exceed level capacity');
  await tx.ticketOrder.createMany({ data: orders });
  await tx.ticketOrderLine.createMany({ data: lines });
  await tx.ticket.createMany({ data: tickets });
  for (const s of seatRows.slice(0, cursor)) await tx.seatInventory.update({ where: { id: s.id }, data: { status: 'sold', occupancyKey: `${event.id}:${s.seatId}` } });
  if (phase && sold > phase.quantity) throw new Error('Setup sales exceed the first pricing phase');
  await tx.priceLevel.update({ where: { id: level.id }, data: { sold: { increment: sold } } });
  if (phase) await tx.priceLevelPhase.update({ where: { id: phase.id }, data: { sold: { increment: sold } } });
}
