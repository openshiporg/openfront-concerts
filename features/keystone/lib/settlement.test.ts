import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSettlement, percentage, ticketQuote, refundableCents, type SettlementInput } from './settlement';
const base: SettlementInput = { grossCents: 100000, taxCents: 5000, passthroughFeesCents: 10000, cappedExpensesCents: 20000, uncappedExpensesCents: 5000, expenseCapCents: 15000, guaranteeCents: 30000, percentageBps: 8000, promoterProfitBps: 1000, depositsPaidCents: 10000, dealType: 'versus' };
test('versus excludes fees and tax, caps expenses and deducts deposits', () => {
 const x = computeSettlement(base); assert.equal(x.netBoxOfficeCents, 85000); assert.equal(x.totalExpensesCents, 20000); assert.equal(x.artistTotalCents, 52000); assert.equal(x.balanceDueArtistCents, 42000);
});
test('versus protects guarantee on a loss', () => assert.equal(computeSettlement({ ...base, grossCents: 0 }).artistTotalCents, 30000));
test('plus pays guarantee plus post-break-even share', () => { const x = computeSettlement({ ...base, dealType: 'plus' }); assert.equal(x.breakevenCents, 58500); assert.equal(x.artistTotalCents, 51200); });
test('flat pays guarantee only', () => assert.equal(computeSettlement({ ...base, dealType: 'flat_guarantee' }).artistTotalCents, 30000));
test('door excludes passthrough fees', () => assert.equal(computeSettlement({ ...base, dealType: 'door_deal' }).artistTotalCents, 68000));
test('percent floors exactly and records remainders', () => { assert.deepEqual(percentage(101, 3333), { cents: 33, remainder: 6633 }); assert.deepEqual(percentage(-101, 3333), { cents: -34, remainder: 3367 }); });
test('merch cuts rounded individually', () => { const x = computeSettlement({ ...base, merchSoftCents: 101, merchHardCents: 99, merchSplitBps: 1500, hardMerchSplitBps: 1000 }); assert.equal(x.merchVenueShareCents, 24); });
test('reject floats, invalid bps, negatives and overflow', () => { for (const patch of [{ grossCents: 1.5 }, { percentageBps: 10001 }, { guaranteeCents: -1 }, { grossCents: Number.MAX_SAFE_INTEGER + 1 }]) assert.throws(() => computeSettlement({ ...base, ...patch })); });
test('quote snapshots all monetary components', () => assert.deepEqual(ticketQuote({ priceCents: 1000, feeCents: 100, facilityFeeCents: 50, quantity: 2, taxBps: 1000, discountBps: 500 }), { subtotalCents: 2000, serviceFeesCents: 200, facilityFeesCents: 100, discountCents: 100, taxCents: 190, totalCents: 2390 }));
test('refund cannot pay twice or exceed original tender', () => { assert.equal(refundableCents(2390, 2390), 0); assert.throws(() => refundableCents(100, 101)); });
