import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleTender, assertDoorQuantity, assertRoom, levelRoom, MAX_COMP_QTY, pickPhase, priceDoorSale } from './door-sale';

test('cash must cover total and returns change', () => {
  assert.deepEqual(settleTender(4500, { kind: 'cash', tenderedCents: 5000 }), { method: 'cash', changeCents: 500, reference: '' });
  assert.throws(() => settleTender(4500, { kind: 'cash', tenderedCents: 4499 }), /less than/);
  assert.throws(() => settleTender(4500, { kind: 'cash', tenderedCents: 50.5 }), /less than/);
});
test('external card needs a terminal reference; unknown tender and zero total are refused', () => {
  assert.equal(settleTender(4500, { kind: 'card_external', reference: 'AUTH-1234' }).method, 'credit_card');
  assert.throws(() => settleTender(4500, { kind: 'card_external', reference: ' ab ' }), /reference/);
  assert.throws(() => settleTender(4500, { kind: 'wire' }), /cash or card/);
  assert.throws(() => settleTender(0, { kind: 'cash', tenderedCents: 0 }), /Nothing/);
});
test('quantity bounds', () => {
  assert.equal(assertDoorQuantity(8), 8);
  for (const q of [0, 9, 1.5, '2', NaN]) assert.throws(() => assertDoorQuantity(q as any));
  assert.equal(assertDoorQuantity(MAX_COMP_QTY, MAX_COMP_QTY), 10);
});
test('capacity counts sold, held and production holds', () => {
  const level = { capacity: 10, sold: 5, held: 2, productionHeld: 2 };
  assert.equal(levelRoom(level), 1);
  assert.doesNotThrow(() => assertRoom(level, 1));
  assert.throws(() => assertRoom(level, 2), /Capacity/);
});

// The scratch-DB level that exposed the discrepancy: level $25, Early bird $20, facility fee $2, no tax.
const level = { priceCents: 2500, facilityFeeCents: 200 };
const phases = [{ id: 'eb', name: 'Early bird', priceCents: 2000, quantity: 80, sold: 25 }, { id: 'ge', name: 'General', priceCents: 2500, quantity: 320, sold: 0 }];
test('door price uses the active phase and the facility fee, not the level list price', () => {
  const phase = pickPhase(phases, {}, 2);
  assert.equal(phase?.id, 'eb');
  const { quote, unitPriceCents } = priceDoorSale('door', level, phase, 2, 0);
  assert.equal(unitPriceCents, 2000);
  assert.equal(quote.subtotalCents, 4000);
  assert.equal(quote.facilityFeesCents, 400);
  assert.equal(quote.totalCents, 4400);
  assert.equal(settleTender(quote.totalCents, { kind: 'cash', tenderedCents: 50000 }).changeCents, 45600);
});
test('preview equals charged: same function, same inputs, same total, with tax too', () => {
  for (const [qty, tax] of [[1, 0], [2, 0], [3, 825], [8, 1000]] as const) {
    const phase = pickPhase(phases, {}, qty);
    const preview = priceDoorSale('door', level, phase, qty, tax);
    const charged = priceDoorSale('door', level, phase, qty, tax);
    assert.deepEqual(preview, charged);
    assert.equal(preview.quote.totalCents, preview.quote.subtotalCents + preview.quote.facilityFeesCents + preview.quote.taxCents);
  }
});
test('phase rolls over when early bird cannot hold the whole party; exhausted phases refuse', () => {
  assert.equal(pickPhase([{ ...phases[0], sold: 79 }, phases[1]], {}, 2)?.id, 'ge');
  assert.equal(pickPhase(phases, { eb: 54 }, 1)?.id, 'eb');
  assert.equal(pickPhase(phases, { eb: 55 }, 1)?.id, 'ge');
  assert.throws(() => pickPhase([{ ...phases[0], sold: 80 }], {}, 1), /exhausted/);
  assert.equal(pickPhase([], {}, 1), null);
});
test('comp is always zero regardless of phase', () => {
  assert.equal(priceDoorSale('comp', level, phases[0], 5, 1000).quote.totalCents, 0);
});
