import { createHash } from 'node:crypto';

/** Binds an approval to exactly one order and exact amount; a changed amount or order invalidates it. */
export function refundApprovalPayload(orderId: string, amountCents: number, reason: string) {
  if (!orderId) throw new Error('Order required');
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw new Error('Refund amount must be a positive whole number of cents');
  return { actionType: 'refund_payment', targetId: orderId, amount: amountCents, reason: String(reason || '').trim() };
}
export function refundApprovalFingerprint(payload: ReturnType<typeof refundApprovalPayload>) {
  return createHash('sha256').update(JSON.stringify([payload.actionType, payload.targetId, payload.amount, payload.reason])).digest('hex');
}
export function assertApprovalUsable(approval: any, input: { actorId: string; fingerprint: string; now?: Date }) {
  const now = input.now ?? new Date();
  if (!approval) throw new Error('Manager approval not found');
  if (approval.requestFingerprint !== input.fingerprint) throw new Error('Approval does not match this order and amount');
  if (approval.requestedById !== input.actorId) throw new Error('Approval was requested by someone else');
  if (!approval.approvedById || approval.approvedById === input.actorId) throw new Error('Approval needs a different manager');
  if (approval.status !== 'approved') throw new Error(`Approval is ${approval.status}`);
  if (new Date(approval.expiresAt) <= now) throw new Error('Approval has expired');
}
