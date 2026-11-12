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

/** A manager closing someone else's drawer must say why; the reason also covers any variance. */
export function overrideReason(reason: unknown) {
  const r = String(reason || '').trim();
  if (!r) throw new Error('Say why you are closing this drawer for the cashier');
  if (r.length > 300) throw new Error('Reason is too long');
  return r;
}

type ReportRow = { openedById?: string | null; openingFloatCents: number; cashSalesCents?: number | null; cashRefundsCents?: number | null; expectedCents?: number | null; countedCents?: number | null; varianceCents?: number | null; status: string };
/** Totals for a drawer report. Open drawers count toward float, sales and refunds but have no count or variance yet. */
export function drawerTotals(rows: ReportRow[]) {
  const t = { drawers: rows.length, open: 0, floatCents: 0, salesCents: 0, refundsCents: 0, expectedCents: 0, countedCents: 0, varianceCents: 0, over: 0, short: 0 };
  for (const r of rows) {
    t.floatCents += r.openingFloatCents; t.salesCents += r.cashSalesCents ?? 0; t.refundsCents += r.cashRefundsCents ?? 0;
    if (r.status === 'open') { t.open++; continue; }
    t.expectedCents += r.expectedCents ?? 0; t.countedCents += r.countedCents ?? 0;
    const v = r.varianceCents ?? 0; t.varianceCents += v; if (v > 0) t.over++; if (v < 0) t.short++;
  }
  return t;
}

/** A report range of calendar days (YYYY-MM-DD, both inclusive) as [start, end) day strings. Max 93 days. */
export function reportRange(from: unknown, to: unknown, today: string) {
  const ok = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  const f = ok(from) ? (from as string) : today;
  const t = ok(to) ? (to as string) : f;
  if (t < f) throw new Error('End date is before the start date');
  const days = (Date.parse(`${t}T00:00:00Z`) - Date.parse(`${f}T00:00:00Z`)) / 86400000 + 1;
  if (days > 93) throw new Error('Pick a range of 93 days or fewer');
  const next = new Date(Date.parse(`${t}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return { from: f, to: t, endExclusive: next };
}
