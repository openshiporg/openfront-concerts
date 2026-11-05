import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLevel, validatePhase, validateExpense, validateTerms, validateCounts, validateCountMaps } from './editors';

test('level: whole cents, positive capacity, never below committed seats', () => {
  const l = validateLevel({ name: ' Floor ', priceCents: 4500, feeCents: 650, capacity: 300 });
  assert.equal(l.name, 'Floor'); assert.equal(l.perOrderLimit, 8); assert.equal(l.facilityFeeCents, 0);
  assert.throws(() => validateLevel({ name: 'x', priceCents: 45.5, capacity: 1 }), /Price/);
  assert.throws(() => validateLevel({ name: '', priceCents: 1, capacity: 1 }), /name required/);
  assert.throws(() => validateLevel({ name: 'x', priceCents: -1, capacity: 1 }), /Price/);
  assert.throws(() => validateLevel({ name: 'x', priceCents: 1, capacity: 0 }), /Capacity/);
  assert.throws(() => validateLevel({ name: 'x', priceCents: 1, capacity: 10 }, { sold: 8, held: 2, productionHeld: 1 }), /below 11/);
  assert.equal(validateLevel({ name: 'x', priceCents: 1, capacity: 11 }, { sold: 8, held: 2, productionHeld: 1 }).capacity, 11);
});
test('phase: quantity floor counts sold and live holds', () => {
  assert.equal(validatePhase({ name: 'Tier 1', priceCents: 3000, quantity: 50, startsAt: '2026-11-01T00:00:00Z' }).startsAt?.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.throws(() => validatePhase({ name: 'Tier 1', priceCents: 3000, quantity: 5 }, { sold: 4, reserved: 2 }), /below 6/);
  assert.throws(() => validatePhase({ name: 'T', priceCents: 1, quantity: 1, startsAt: 'nope' }), /valid date/);
});
test('expense: known category, cents, capped flag only when true', () => {
  const e = validateExpense({ category: 'security', vendor: ' Guard Co ', budgetCents: 100000, actualCents: 95000, isCapped: 'yes' });
  assert.equal(e.vendor, 'Guard Co'); assert.equal(e.isCapped, false);
  assert.throws(() => validateExpense({ category: 'bribes' }), /category/);
  assert.throws(() => validateExpense({ category: 'other', actualCents: 1.2 }), /Actual/);
});
test('terms: shape follows the deal type', () => {
  assert.equal(validateTerms({ dealType: 'flat_guarantee', guaranteeCents: 500000 }).percentageBps, 0);
  assert.throws(() => validateTerms({ dealType: 'flat_guarantee', guaranteeCents: 0 }), /Guarantee required/);
  assert.throws(() => validateTerms({ dealType: 'flat_guarantee', guaranteeCents: 1, percentageBps: 100 }), /no percentage/);
  assert.throws(() => validateTerms({ dealType: 'versus', guaranteeCents: 1 }), /percentage required/);
  assert.throws(() => validateTerms({ dealType: 'door_deal', percentageBps: 7000, guaranteeCents: 5 }), /no guarantee/);
  assert.equal(validateTerms({ dealType: 'door_deal', percentageBps: 7000 }).guaranteeCents, 0);
  assert.throws(() => validateTerms({ dealType: 'plus', guaranteeCents: 100, percentageBps: 10001 }), /0–100%/);
  assert.throws(() => validateTerms({ dealType: 'versus', guaranteeCents: 100, percentageBps: 8000, depositCents: 200, depositDueAt: '2027-01-01' }), /exceed/);
  assert.throws(() => validateTerms({ dealType: 'versus', guaranteeCents: 100, percentageBps: 8000, depositCents: 50 }), /due date/);
  assert.throws(() => validateTerms({ dealType: 'nope' }), /deal type/);
});
test('count sheet: unique items, out never above in', () => {
  assert.deepEqual(validateCounts([{ item: 'Tee', countIn: 100, countOut: 40 }]), [{ item: 'Tee', countIn: 100, countOut: 40, sold: 60 }]);
  assert.throws(() => validateCounts([{ item: 'Tee', countIn: 10, countOut: 11 }]), /exceeds/);
  assert.throws(() => validateCounts([{ item: 'Tee', countIn: 1, countOut: 0 }, { item: 'tee', countIn: 1, countOut: 0 }]), /twice/);
  assert.equal(validateCountMaps(undefined, null), null);
  assert.equal(validateCountMaps({ Tee: 10, Hat: 5 }, { Tee: 2, Hat: 5 })!.length, 2);
  assert.throws(() => validateCountMaps({ Tee: 10 }, undefined), /item counts/);
  assert.throws(() => validateCountMaps({ Tee: 10 }, { Hat: 1 }), /not counted in|count out/);
});
