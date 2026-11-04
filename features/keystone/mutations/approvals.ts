import { permissions } from '../access';
import { appendAuditEvent } from '../lib/audit';
import { refundApprovalPayload, refundApprovalFingerprint } from '../lib/refund-approval';

const TTL_MS = 15 * 60 * 1000;

/** Requester (canIssueRefunds) asks for approval of an exact order and amount. */
export async function requestRefundApproval(_: any, { input }: any, context: any) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error('Permission required: canIssueRefunds');
  const actor = context.session.itemId;
  const reason = String(input.reason || '').trim();
  if (!reason) throw new Error('Reason required');
  const payload = refundApprovalPayload(input.orderId, input.amountCents, reason, input.cash ? 'cash_refund' : 'refund_payment');
  return context.prisma.$transaction(async (tx: any) => {
    const order = await tx.ticketOrder.findUnique({ where: { id: input.orderId } });
    if (!order || !['paid', 'partially_refunded'].includes(order.status)) throw new Error('Order is not refundable');
    if (payload.amount > order.totalCents - order.refundedCents) throw new Error('Refund exceeds unrefunded balance');
    const door = await tx.payment.findFirst({ where: { orderId: order.id, status: { in: ['succeeded', 'partially_refunded'] } } });
    if (!door) throw new Error('No captured payment');
    if (Boolean(input.cash) !== !door.providerPaymentId) throw new Error(input.cash ? 'Only door cash and terminal sales use a cash refund' : 'Door sales are refunded as a cash refund');
    const fingerprint = refundApprovalFingerprint(payload);
    const existing = await tx.managerApproval.findFirst({ where: { requestFingerprint: fingerprint, requestedById: actor, status: { in: ['pending', 'approved'] }, expiresAt: { gt: new Date() } } });
    if (existing) return { id: existing.id, status: existing.status, expiresAt: existing.expiresAt };
    const row = await tx.managerApproval.create({ data: { ...payload, requestFingerprint: fingerprint, requestPayload: payload, status: 'pending', requestedById: actor, expiresAt: new Date(Date.now() + TTL_MS) } });
    await appendAuditEvent(tx, actor, { action: 'approval.requested', targetList: 'ManagerApproval', targetId: row.id, after: payload, reason });
    return { id: row.id, status: row.status, expiresAt: row.expiresAt };
  });
}

/** A different user holding canApproveAdjustments approves; compare-and-set on pending. */
export async function decideRefundApproval(_: any, { input }: any, context: any) {
  if (!permissions.canApproveAdjustments({ session: context.session })) throw new Error('Permission required: canApproveAdjustments');
  const actor = context.session.itemId;
  const approve = input.decision === 'approve';
  if (!approve && input.decision !== 'reject') throw new Error('Decision must be approve or reject');
  return context.prisma.$transaction(async (tx: any) => {
    const row = await tx.managerApproval.findUnique({ where: { id: input.approvalId } });
    if (!row) throw new Error('Approval not found');
    if (row.requestedById === actor) throw new Error('You cannot decide your own request');
    if (new Date(row.expiresAt) <= new Date()) { await tx.managerApproval.updateMany({ where: { id: row.id, status: 'pending' }, data: { status: 'expired' } }); throw new Error('Approval request has expired'); }
    const next = approve ? 'approved' : 'rejected';
    const done = await tx.managerApproval.updateMany({ where: { id: row.id, status: 'pending', requestedById: { not: actor } }, data: { status: next, approvedById: actor, approvedAt: new Date() } });
    if (done.count !== 1) throw new Error('Approval is no longer pending');
    await appendAuditEvent(tx, actor, { action: `approval.${next}`, targetList: 'ManagerApproval', targetId: row.id, before: { status: 'pending' }, after: { status: next }, reason: input.note || '' });
    return { id: row.id, status: next };
  });
}
