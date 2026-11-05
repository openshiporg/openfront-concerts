/** Pure cash-drawer rules (no I/O, unit tested). */
export const DENOMINATIONS: [string, number][] = [['100', 10000], ['50', 5000], ['20', 2000], ['10', 1000], ['5', 500], ['1', 100], ['coins', 1]];
export const MAX_FLOAT_CENTS = 1_000_000;

export function drawerOpenKey(userId: string) { return `user:${userId}`; }

export function assertFloat(cents: unknown) {
  if (!Number.isSafeInteger(cents) || (cents as number) < 0 || (cents as number) > MAX_FLOAT_CENTS) throw new Error('Opening float must be whole cents up to $10,000');
  return cents as number;
}
/** Counted cash from a denomination sheet: {"20": 12, "coins": 345} → cents. Coins are entered in cents. */
export function countedFromSheet(sheet: unknown) {
  if (!sheet || typeof sheet !== 'object' || Array.isArray(sheet)) throw new Error('Count every denomination');
  let total = 0;
  for (const [k, v] of Object.entries(sheet as Record<string, unknown>)) {
    const d = DENOMINATIONS.find(([name]) => name === k);
    if (!d) throw new Error(`Unknown denomination ${k}`);
    if (!Number.isSafeInteger(v) || (v as number) < 0) throw new Error(`Count for ${k} must be a whole number`);
    total += d[1] * (v as number);
  }
  return total;
}
export function expectedCash(d: { openingFloatCents: number; cashSalesCents: number; cashRefundsCents: number }) {
  return d.openingFloatCents + d.cashSalesCents - d.cashRefundsCents;
}
/** Close-out: variance is counted minus expected. Any variance needs a written reason. */
export function closeOut(d: { openingFloatCents: number; cashSalesCents: number; cashRefundsCents: number }, countedCents: number, reason: string) {
  const expectedCents = expectedCash(d);
  const varianceCents = countedCents - expectedCents;
  if (varianceCents !== 0 && !reason.trim()) throw new Error(`Drawer is ${varianceCents > 0 ? 'over' : 'short'} by $${(Math.abs(varianceCents) / 100).toFixed(2)}; give a reason`);
  return { expectedCents, varianceCents };
}
