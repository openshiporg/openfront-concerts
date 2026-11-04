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
/** Remaining capacity of a level; production holds, live holds and sold all count. */
export function levelRoom(level: { capacity: number; sold: number; held: number; productionHeld: number }) {
  return level.capacity - level.sold - level.held - level.productionHeld;
}
export function assertRoom(level: { capacity: number; sold: number; held: number; productionHeld: number }, qty: number) {
  if (levelRoom(level) < qty) throw new Error('Capacity exhausted');
}
