import { permissions } from '../access';
import { command } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { refundApprovalPayload, refundApprovalFingerprint, assertApprovalUsable } from '../lib/refund-approval';
import { successfulRefundTotal } from '../utils/paymentState';

/**
 * Door cash and external-terminal sales have no provider to call: the refund is the money handed back at the
 * box office, so it is always approval-bound (no threshold), recorded here and audited. One transaction.
 */
export async function refundDoorSale(_: any, { input }: any, context: any) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error('Permission required: canIssueRefunds');
  const { orderId, idempotencyKey, approvalId } = input;
  const reason = String(input.reason || '').trim();
  if (!idempotencyKey || !reason) throw new Error('Reason and idempotency key required');
  if (!approvalId) throw new Error('A different manager must approve this cash refund');
  const actor = context.session.itemId;
  const order0 = await context.prisma.ticketOrder.findUnique({ where: { id: orderId } });
  if (!order0) throw new Error('Order not found');
  return command(context, { operation: 'refundDoorSale', idempotencyKey, lock: `event:${order0.eventId}`, params: { orderId, amountCents: input.amountCents, reason, approvalId } }, async tx => {
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    if (!order || order.source !== 'box_office' || !['paid', 'partially_refunded'].includes(order.status)) throw new Error('Order is not a refundable door sale');
    const payment = await tx.payment.findFirst({ where: { orderId, status: { in: ['succeeded', 'partially_refunded'] } } });
    if (!payment || payment.providerPaymentId) throw new Error('Not a door cash or terminal payment');
    const rows = await tx.refund.findMany({ where: { paymentId: payment.id, status: { in: ['processing', 'unknown', 'succeeded'] } } });
    const available = payment.amount - rows.reduce((n: number, r: any) => n + r.amount, 0);
    const amount = input.amountCents ?? available;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > available) throw new Error('Refund exceeds unrefunded balance');
    const approval = await tx.managerApproval.findUnique({ where: { id: approvalId } });
    assertApprovalUsable(approval, { actorId: actor, fingerprint: refundApprovalFingerprint(refundApprovalPayload(orderId, amount, reason, 'cash_refund')) });
    const consumed = await tx.managerApproval.updateMany({ where: { id: approvalId, status: 'approved', expiresAt: { gt: new Date() } }, data: { status: 'consumed', consumedAt: new Date(), consumedEntityType: 'TicketOrder', consumedEntityId: orderId } });
    if (consumed.count !== 1) throw new Error('Approval was already used or expired');
    const refund = await tx.refund.create({ data: { idempotencyKey: `door-refund:${idempotencyKey}`, amount, currencyCode: payment.currencyCode, status: 'succeeded', reason, paymentId: payment.id, orderId, requestedById: actor, approvedById: approval.approvedById, processedAt: new Date(), providerData: { channel: 'door', method: payment.paymentMethod } } });
    const total = successfulRefundTotal([...rows.filter((r: any) => r.status === 'succeeded'), refund]);
    const full = total >= order.totalCents;
    await tx.payment.update({ where: { id: payment.id }, data: { refundedAmount: total, status: full ? 'refunded' : 'partially_refunded' } });
    await tx.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: total, status: full ? 'refunded' : 'partially_refunded' } });
    if (full) {
      const tickets = await tx.ticket.findMany({ where: { orderId, status: { in: ['valid', 'checked_in'] } } });
      for (const t of tickets) await tx.ticket.update({ where: { id: t.id }, data: { status: 'refunded', tokenHash: '' } });
      const lines = await tx.ticketOrderLine.findMany({ where: { orderId } });
      for (const l of lines) {
        await tx.priceLevel.update({ where: { id: l.priceLevelId }, data: { sold: { decrement: l.quantity } } });
        if (l.phaseId) await tx.priceLevelPhase.update({ where: { id: l.phaseId }, data: { sold: { decrement: l.quantity } } });
      }
    }
    await appendAuditEvent(tx, actor, { action: 'refund.door_cash', targetList: 'Refund', targetId: refund.id, after: { amount, total, full, approvalId, method: payment.paymentMethod }, reason });
    return { refundId: refund.id, status: 'succeeded', amountCents: amount, full };
  });
}
