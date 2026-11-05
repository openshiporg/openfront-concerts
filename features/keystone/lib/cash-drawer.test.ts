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
