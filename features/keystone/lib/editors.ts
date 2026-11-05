/** Pure validation for operator editors (pricing, expenses, offer terms). No I/O; unit tested. */
const MAX_CENTS = 100_000_000_00; // $100M ceiling per field

export function cents(value: unknown, label: string, { min = 0, max = MAX_CENTS } = {}) {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`${label} must be whole cents from ${min} to ${max}`);
  return value as number;
}
export function count(value: unknown, label: string, { min = 0, max = 1_000_000 } = {}) {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`${label} must be a whole number from ${min} to ${max}`);
  return value as number;
}
export function bps(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 10000) throw new Error(`${label} must be 0–100%`);
  return value as number;
}
export function name(value: unknown, label: string, max = 120) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} required`);
  if (text.length > max) throw new Error(`${label} is too long`);
  return text;
}
export function optionalDate(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(+d)) throw new Error(`${label} is not a valid date`);
  return d;
}

/** Events whose pricing can still change: anything before the show is over. */
export const PRICING_OPEN = ['hold', 'announced', 'presale', 'on_sale', 'sold_out', 'postponed', 'doors'];
export const LEVEL_STATUSES = ['active', 'paused', 'closed'] as const;

export type LevelInput = { name: string; priceCents: number; feeCents: number; facilityFeeCents: number; capacity: number; perOrderLimit: number };
export function validateLevel(input: any, used: { sold: number; held: number; productionHeld: number } = { sold: 0, held: 0, productionHeld: 0 }): LevelInput {
  const level = {
    name: name(input.name, 'Level name'),
    priceCents: cents(input.priceCents, 'Price'),
    feeCents: cents(input.feeCents ?? 0, 'Service fee'),
    facilityFeeCents: cents(input.facilityFeeCents ?? 0, 'Facility fee'),
    capacity: count(input.capacity, 'Capacity', { min: 1 }),
    perOrderLimit: count(input.perOrderLimit ?? 8, 'Per-order limit', { min: 1, max: 50 }),
  };
  const committed = used.sold + used.held + used.productionHeld;
  if (level.capacity < committed) throw new Error(`Capacity cannot go below ${committed} (sold, held and blocked)`);
  return level;
}

export type PhaseInput = { name: string; priceCents: number; quantity: number; sort: number; startsAt: Date | null };
export function validatePhase(input: any, used: { sold: number; reserved: number } = { sold: 0, reserved: 0 }): PhaseInput {
  const phase = {
    name: name(input.name, 'Phase name'),
    priceCents: cents(input.priceCents, 'Phase price'),
    quantity: count(input.quantity, 'Phase quantity', { min: 1 }),
    sort: count(input.sort ?? 0, 'Order', { max: 1000 }),
    startsAt: optionalDate(input.startsAt, 'Phase start'),
  };
  if (phase.quantity < used.sold + used.reserved) throw new Error(`Phase quantity cannot go below ${used.sold + used.reserved} (sold and held)`);
  return phase;
}

export const EXPENSE_CATEGORIES = ['venue_rent', 'production', 'security', 'stagehands', 'marketing', 'catering', 'insurance', 'ticketing', 'other'];
export function validateExpense(input: any) {
  if (!EXPENSE_CATEGORIES.includes(input.category)) throw new Error('Unknown expense category');
  const vendor = String(input.vendor ?? '').trim();
  if (vendor.length > 120) throw new Error('Vendor is too long');
  const notes = String(input.notes ?? '').trim();
  if (notes.length > 1000) throw new Error('Notes are too long');
  return { category: input.category as string, vendor, notes, budgetCents: cents(input.budgetCents ?? 0, 'Budget'), actualCents: cents(input.actualCents ?? 0, 'Actual'), isCapped: input.isCapped === true };
}
export const FROZEN_SETTLEMENT = ['signed_promoter', 'signed_artist', 'final'];

export const DEAL_TYPES = ['flat_guarantee', 'versus', 'plus', 'door_deal'];
/** Offer terms as drafted. A guarantee is required unless it is a door deal; a percentage is required unless it is flat. */
export function validateTerms(input: any) {
  if (!DEAL_TYPES.includes(input.dealType)) throw new Error('Unknown deal type');
  const terms = {
    dealType: input.dealType as string,
    guaranteeCents: cents(input.guaranteeCents ?? 0, 'Guarantee'),
    percentageBps: bps(input.percentageBps ?? 0, 'Artist percentage'),
    promoterProfitBps: bps(input.promoterProfitBps ?? 0, 'Promoter profit'),
    expenseCapCents: cents(input.expenseCapCents ?? 0, 'Expense cap'),
    merchSplitBps: bps(input.merchSplitBps ?? 0, 'Soft merch split'),
    hardMerchSplitBps: bps(input.hardMerchSplitBps ?? 0, 'Hard merch split'),
    hospitalityRiderCents: cents(input.hospitalityRiderCents ?? 0, 'Hospitality rider'),
    depositCents: cents(input.depositCents ?? 0, 'Deposit'),
    depositDueAt: optionalDate(input.depositDueAt, 'Deposit due date'),
    breakevenBasis: String(input.breakevenBasis ?? '').trim().slice(0, 500),
    radiusClause: String(input.radiusClause ?? '').trim().slice(0, 500),
    notes: String(input.notes ?? '').trim().slice(0, 2000),
  };
  if (terms.dealType !== 'door_deal' && terms.guaranteeCents < 1) throw new Error('Guarantee required for this deal type');
  if (terms.dealType !== 'flat_guarantee' && terms.percentageBps < 1) throw new Error('Artist percentage required for this deal type');
  if (terms.dealType === 'flat_guarantee' && terms.percentageBps) throw new Error('A flat guarantee has no percentage');
  if (terms.dealType === 'door_deal' && terms.guaranteeCents) throw new Error('A door deal has no guarantee');
  if (terms.dealType !== 'door_deal' && terms.depositCents > terms.guaranteeCents) throw new Error('Deposit cannot exceed the guarantee');
  if (terms.depositCents && !terms.depositDueAt) throw new Error('Deposit due date required');
  return terms;
}
/** Live offers block a second draft for the same artist on the same event. */
export const LIVE_OFFER = ['draft', 'sent', 'accepted', 'contracted'];
/** Statuses a new version may replace. Contracted and settled terms are binding; correct those through settlement adjustments. */
export const REVISABLE = ['sent', 'accepted', 'declined'];

/** Count sheet stored as two maps (item → units). Both or neither; same items; out never exceeds in. */
export function validateCountMaps(countIn: unknown, countOut: unknown) {
  if ((countIn === undefined || countIn === null) && (countOut === undefined || countOut === null)) return null;
  const isMap = (v: unknown) => v && typeof v === 'object' && !Array.isArray(v);
  if (!isMap(countIn) || !isMap(countOut)) throw new Error('Count in and count out must be item counts');
  const lines = Object.keys(countIn as object).map(item => ({ item, countIn: (countIn as any)[item], countOut: (countOut as any)[item] }));
  if (Object.keys(countOut as object).some(k => !(k in (countIn as object)))) throw new Error('Count out lists an item that was not counted in');
  return validateCounts(lines);
}
/** Merch count sheet: item lines with count in and count out. Returns per-item sold units. */
export function validateCounts(lines: unknown) {
  if (lines === undefined || lines === null) return [];
  if (!Array.isArray(lines) || lines.length > 100) throw new Error('Count sheet must be a list of up to 100 items');
  const seen = new Set<string>();
  return lines.map((l: any) => {
    const item = name(l?.item, 'Item', 80);
    if (seen.has(item.toLowerCase())) throw new Error(`Item ${item} listed twice`);
    seen.add(item.toLowerCase());
    const countIn = count(l.countIn, `${item} count in`);
    const countOut = count(l.countOut, `${item} count out`);
    if (countOut > countIn) throw new Error(`${item}: count out exceeds count in`);
    return { item, countIn, countOut, sold: countIn - countOut };
  });
}
