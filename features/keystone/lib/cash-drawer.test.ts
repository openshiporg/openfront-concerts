import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFloat, countedFromSheet, expectedCash, closeOut } from './cash-drawer';

test('float is bounded whole cents', () => {
  assert.equal(assertFloat(20000), 20000);
  assert.throws(() => assertFloat(-1), /float/); assert.throws(() => assertFloat(1.5), /float/); assert.throws(() => assertFloat(1_000_001), /float/);
});
test('denomination sheet adds up; coins in cents', () => {
  assert.equal(countedFromSheet({ '100': 1, '20': 12, '1': 3, coins: 45 }), 10000 + 24000 + 300 + 45);
  assert.throws(() => countedFromSheet({ '3': 1 }), /Unknown/);
  assert.throws(() => countedFromSheet({ '20': -1 }), /whole/);
  assert.throws(() => countedFromSheet(null), /Count/);
});
test('expected = float + cash sales − cash refunds; variance needs a reason', () => {
  const d = { openingFloatCents: 20000, cashSalesCents: 15500, cashRefundsCents: 4500 };
  assert.equal(expectedCash(d), 31000);
  assert.deepEqual(closeOut(d, 31000, ''), { expectedCents: 31000, varianceCents: 0 });
  assert.throws(() => closeOut(d, 30500, ' '), /short by \$5\.00/);
  assert.throws(() => closeOut(d, 31100, ''), /over by \$1\.00/);
  assert.equal(closeOut(d, 30500, 'Change error').varianceCents, -500);
});

import { overrideReason, drawerTotals, reportRange } from './cash-drawer';
test('manager override needs a reason', () => {
  assert.throws(() => overrideReason('  '), /why/);
  assert.equal(overrideReason(' left early '), 'left early');
  assert.throws(() => overrideReason('x'.repeat(301)), /long/);
});
test('report totals skip open drawers for count and variance', () => {
  const t = drawerTotals([
    { status: 'closed', openingFloatCents: 20000, cashSalesCents: 5000, cashRefundsCents: 1000, expectedCents: 24000, countedCents: 23500, varianceCents: -500 },
    { status: 'closed', openingFloatCents: 10000, cashSalesCents: 0, cashRefundsCents: 0, expectedCents: 10000, countedCents: 10200, varianceCents: 200 },
    { status: 'open', openingFloatCents: 5000, cashSalesCents: 700, cashRefundsCents: 0 },
  ]);
  assert.deepEqual(t, { drawers: 3, open: 1, floatCents: 35000, salesCents: 5700, refundsCents: 1000, expectedCents: 34000, countedCents: 33700, varianceCents: -300, over: 1, short: 1 });
});
test('report range: defaults to a day, inclusive end, bounded', () => {
  assert.deepEqual(reportRange(undefined, undefined, '2026-11-12'), { from: '2026-11-12', to: '2026-11-12', endExclusive: '2026-11-13' });
  assert.deepEqual(reportRange('2026-12-30', '2026-12-31', 'x'), { from: '2026-12-30', to: '2026-12-31', endExclusive: '2027-01-01' });
  assert.throws(() => reportRange('2026-11-05', '2026-11-01', 'x'), /before/);
  assert.throws(() => reportRange('2026-01-01', '2026-06-01', 'x'), /93/);
  assert.equal(reportRange('2026-02-30', 'junk', '2026-11-12').from, '2026-11-12');
});
