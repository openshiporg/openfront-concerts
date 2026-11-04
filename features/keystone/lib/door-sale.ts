import { ticketQuote } from './settlement';

/** Pure rules for box-office door sales and comps (no I/O, unit tested). */
export const DOOR_STATUSES = ['presale', 'on_sale', 'doors', 'in_progress'];
export const MAX_DOOR_QTY = 8;
export const MAX_COMP_QTY = 10;

export type Tender = { kind: 'cash'; tenderedCents: number } | { kind: 'card_external'; reference: string };

export function assertDoorQuantity(qty: unknown, max = MAX_DOOR_QTY) {
  if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > max) throw new Error(`Quantity must be 1–${max}`);
  return qty as number;
}
/** Cash must cover the total; external card needs the terminal reference. Returns change owed. */
export function settleTender(totalCents: number, tender: any): { method: 'cash' | 'credit_card'; changeCents: number; reference: string } {
  if (!Number.isSafeInteger(totalCents) || totalCents < 1) throw new Error('Nothing to charge');
  if (tender?.kind === 'cash') {
    if (!Number.isSafeInteger(tender.tenderedCents) || tender.tenderedCents < totalCents) throw new Error('Cash tendered is less than the total');
    return { method: 'cash', changeCents: tender.tenderedCents - totalCents, reference: '' };
  }
  if (tender?.kind === 'card_external') {
    const reference = String(tender.reference || '').trim();
    if (reference.length < 4) throw new Error('Card terminal reference required');
    return { method: 'credit_card', changeCents: 0, reference };
  }
  throw new Error('Choose cash or card terminal');
}
type PhaseRow = { id: string; name: string; priceCents: number; quantity: number; sold: number };
/** First started phase with room for qty (sold plus live holds). null when there are no phases; throws when all are exhausted. */
export function pickPhase(phases: PhaseRow[], reservedByPhase: Record<string, number>, qty: number): PhaseRow | null {
  if (!phases.length) return null;
  const hit = phases.find((p) => p.sold + (reservedByPhase[p.id] || 0) + qty <= p.quantity);
  if (!hit) throw new Error('Pricing phase exhausted');
  return hit;
}
/**
 * The ONE price rule for door sales and comps. Door sales charge the active phase price (else the level price),
 * the facility fee and venue tax; no online service fee at the door. Comps are zero. Preview and charge both call this.
 */
export function priceDoorSale(kind: 'door' | 'comp', level: { priceCents: number; facilityFeeCents: number }, phase: { priceCents: number } | null, qty: number, taxBps: number) {
  const unitPriceCents = kind === 'comp' ? 0 : phase?.priceCents ?? level.priceCents;
  const quote = kind === 'comp'
    ? { subtotalCents: 0, serviceFeesCents: 0, facilityFeesCents: 0, discountCents: 0, taxCents: 0, totalCents: 0 }
    : ticketQuote({ priceCents: unitPriceCents, feeCents: 0, facilityFeeCents: level.facilityFeeCents, quantity: qty, taxBps });
  return { unitPriceCents, quote };
}
/** Remaining capacity of a level; production holds, live holds and sold all count. */
export function levelRoom(level: { capacity: number; sold: number; held: number; productionHeld: number }) {
  return level.capacity - level.sold - level.held - level.productionHeld;
}
export function assertRoom(level: { capacity: number; sold: number; held: number; productionHeld: number }, qty: number) {
  if (levelRoom(level) < qty) throw new Error('Capacity exhausted');
}
