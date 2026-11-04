import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleTender, assertDoorQuantity, assertRoom, levelRoom, MAX_COMP_QTY } from './door-sale';

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
