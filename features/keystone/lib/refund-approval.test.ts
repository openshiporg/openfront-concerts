import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refundApprovalPayload, refundApprovalFingerprint, assertApprovalUsable } from './refund-approval';

const fp = refundApprovalFingerprint(refundApprovalPayload('o1', 5000, 'Show cancelled'));
const ok = { requestFingerprint: fp, requestedById: 'a', approvedById: 'b', status: 'approved', expiresAt: new Date(Date.now() + 60000) };
test('approval is bound to order, amount and reason', () => {
  assert.notEqual(fp, refundApprovalFingerprint(refundApprovalPayload('o1', 5001, 'Show cancelled')));
  assert.notEqual(fp, refundApprovalFingerprint(refundApprovalPayload('o2', 5000, 'Show cancelled')));
  assert.doesNotThrow(() => assertApprovalUsable(ok, { actorId: 'a', fingerprint: fp }));
});
test('a card refund approval cannot authorise a cash refund, and vice versa', () => {
  assert.notEqual(fp, refundApprovalFingerprint(refundApprovalPayload('o1', 5000, 'Show cancelled', 'cash_refund')));
});
test('refusals: wrong requester, self approval, pending, consumed, expired, other amount', () => {
  const t = (a: any, f = fp, actor = 'a') => assert.throws(() => assertApprovalUsable({ ...ok, ...a }, { actorId: actor, fingerprint: f }));
  t({}, fp, 'c'); t({ approvedById: 'a' }); t({ approvedById: null }); t({ status: 'pending' }); t({ status: 'consumed' });
  t({ expiresAt: new Date(Date.now() - 1) }); t({}, refundApprovalFingerprint(refundApprovalPayload('o1', 4000, 'Show cancelled')));
  assert.throws(() => assertApprovalUsable(null, { actorId: 'a', fingerprint: fp }));
});
test('rejects fractional, zero and negative amounts', () => {
  for (const n of [0, -1, 1.5, NaN]) assert.throws(() => refundApprovalPayload('o1', n, 'x'));
});
