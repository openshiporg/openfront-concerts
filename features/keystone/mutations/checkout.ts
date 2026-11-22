import crypto from 'node:crypto';
import { command, checkedClient, lockTransactionKey } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { createProof, verifyProof, ownedHold, ownedOrder, opaqueToken, digest, humanCode, ticketToken, ticketScanValue } from '../lib/guest-proof';
import { deliverOrderConfirmation, sendTransferEmail, sendRefundEmail } from '../lib/order-mail';
import { refundableCents } from '../lib/settlement';
import { refundApprovalPayload, refundApprovalFingerprint, assertApprovalUsable } from '../lib/refund-approval';
import { createPayment, getPaymentStatus, refundPayment as providerRefund, cancelPayment, handleWebhook } from '../utils/paymentProviderAdapter';
import { assertCheckoutProviderObservation } from '../utils/checkoutProviderObservation';
import { getPublicPaymentProviderConfig } from '../utils/paymentProviderConfig';
import { nextPaymentStatus, webhookPaymentStatus, successfulRefundTotal } from '../utils/paymentState';
import { permissions, permissionRefusal } from '../access';
import { expireHolds } from './inventory';

const PROVIDER_FIELDS = 'id code isInstalled credentials createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction';
async function stripeProvider(context: any) {
  const sudo = context.sudo();
  let [provider] = await sudo.query.PaymentProvider.findMany({ where: { code: { equals: 'pp_stripe_stripe' } }, query: PROVIDER_FIELDS, take: 1 });
  if (!provider && getPublicPaymentProviderConfig('pp_stripe_stripe')) {
    provider = await sudo.query.PaymentProvider.createOne({ data: { name: 'Stripe', code: 'pp_stripe_stripe', isInstalled: true, createPaymentFunction: 'stripe', capturePaymentFunction: 'stripe', refundPaymentFunction: 'stripe', getPaymentStatusFunction: 'stripe', generatePaymentLinkFunction: 'stripe', handleWebhookFunction: 'stripe' }, query: PROVIDER_FIELDS });
  }
  if (!provider?.isInstalled) throw new Error('Card payments are not configured');
  const [full] = await context.prisma.paymentProvider.findMany({ where: { id: provider.id }, take: 1 });
  return { ...provider, credentials: full?.credentials || {} };
}

export async function startTicketCheckout(_: any, { input }: any, context: any) {
  const { holdId, proof, email, name, ageAttested, idempotencyKey } = input;
  if (!idempotencyKey) throw new Error('Idempotency key required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '') || !String(name || '').trim()) throw new Error('Name and valid email required');
  const hold0 = await ownedHold(context, holdId, proof);
  const provider = await stripeProvider(context);
  const local = await command(context, { operation: 'startTicketCheckout', idempotencyKey, lock: `event:${hold0.eventId}`, params: { holdId, email, name, ageAttested: !!ageAttested } }, async tx => {
    await expireHolds(tx, hold0.eventId);
    const hold = await tx.inventoryHold.findUnique({ where: { id: holdId }, include: { event: true } });
    if (!hold || hold.status !== 'active' || hold.expiresAt <= new Date()) throw new Error('Hold expired');
    if (hold.event.showAt && hold.event.showAt <= new Date()) throw new Error('This show has already started, so tickets are no longer sold');
    if (hold.orderId) {
      // a retry after a failed payment start (new click, new key): the holder of this hold's proof picks up the same order and payment session
      const started = await tx.ticketOrder.findUnique({ where: { id: hold.orderId } });
      const open = started?.status === 'pending_payment' ? await tx.paymentSession.findFirst({ where: { paymentCollectionId: started.paymentCollectionId, isSelected: true } }) : null;
      if (!open) throw new Error('Checkout already started for this hold');
      return { orderId: started.id, sessionId: open.id, sessionKey: open.idempotencyKey, total: started.totalCents, currency: started.currencyCode, orderNumber: started.orderNumber, expiresAt: hold.expiresAt, replay: true };
    }
    const q = hold.quoteSnapshot;
    if (q.perOrderLimit && hold.quantity > q.perOrderLimit) throw new Error('Per-order limit exceeded');
    if (hold.event.ageRestriction !== 'all_ages' && !ageAttested) throw new Error('Age confirmation required');
    const secret = opaqueToken();
    const order = await tx.ticketOrder.create({ data: { orderNumber: humanCode('CN'), guestEmail: email.trim().toLowerCase(), guestName: name.trim(), secretKey: digest(secret), subtotalCents: q.subtotalCents, serviceFeesCents: q.serviceFeesCents, facilityFeesCents: q.facilityFeesCents, taxCents: q.taxCents, discountCents: q.discountCents, totalCents: q.totalCents, currencyCode: q.currencyCode, ageAttested: !!ageAttested, status: 'pending_payment', source: hold.presaleCode ? 'presale' : 'online', eventId: hold.eventId, customerId: context.session?.itemId || null, discountSnapshot: { code: hold.presaleCode || null, discountCents: q.discountCents } } });
    const expiresAt = new Date(Date.now() + 20 * 60000);
    await tx.inventoryHold.update({ where: { id: hold.id }, data: { orderId: order.id, expiresAt } });
    await tx.promoRedemption.updateMany({ where: { holdId: hold.id, status: 'reserved' }, data: { orderId: order.id } });
    const collection = await tx.paymentCollection.create({ data: { amount: q.totalCents } });
    await tx.ticketOrder.update({ where: { id: order.id }, data: { paymentCollectionId: collection.id } });
    const session = await tx.paymentSession.create({ data: { paymentCollectionId: collection.id, paymentProviderId: provider.id, amount: q.totalCents, idempotencyKey: crypto.createHash('sha256').update(`${idempotencyKey}:${order.id}`).digest('hex'), isSelected: true, data: { state: 'initializing', checkoutQuote: q, holdId: hold.id } } });
    await appendAuditEvent(tx, context.session?.itemId, { action: 'checkout.started', targetList: 'TicketOrder', targetId: order.id, after: { totalCents: q.totalCents } });
    return { orderId: order.id, sessionId: session.id, sessionKey: session.idempotencyKey, total: q.totalCents, currency: q.currencyCode, orderNumber: order.orderNumber, expiresAt, replay: false };
  });
  const prisma = context.prisma;
  const session = await prisma.paymentSession.findUnique({ where: { id: local.sessionId } });
  if (session.isInitiated && session.data?.clientSecret) return { orderId: local.orderId, orderNumber: local.orderNumber, proof: createProof(local.orderId), clientSecret: session.data.clientSecret, publishableKey: getPublicPaymentProviderConfig('pp_stripe_stripe')?.publishableKey, totalCents: local.total, expiresAt: local.expiresAt };
  let created;
  try {
    created = await createPayment({ provider, order: { id: local.orderId, orderNumber: local.orderNumber }, amount: local.total, currency: local.currency, idempotencyKey: session.idempotencyKey });
  } catch (error) {
    await prisma.paymentSession.update({ where: { id: session.id }, data: { data: { ...session.data, state: 'unknown' } } });
    throw error;
  }
  await prisma.paymentSession.update({ where: { id: session.id }, data: { isInitiated: true, data: { ...session.data, state: 'ready', paymentIntentId: created.paymentIntentId, clientSecret: created.clientSecret } } });
  return { orderId: local.orderId, orderNumber: local.orderNumber, proof: createProof(local.orderId), clientSecret: created.clientSecret, publishableKey: getPublicPaymentProviderConfig('pp_stripe_stripe')?.publishableKey, totalCents: local.total, expiresAt: local.expiresAt };
}

/** Shared by the browser return path and the signed webhook. Idempotent per order. */
export async function finalizePaidOrder(context: any, orderId: string, provider: any, observed?: any) {
  const prisma = context.prisma;
  const order0 = await prisma.ticketOrder.findUnique({ where: { id: orderId } });
  if (!order0) throw new Error('Order not found');
  const session = await prisma.paymentSession.findFirst({ where: { paymentCollectionId: order0.paymentCollectionId, isSelected: true } });
  const intentId = session?.data?.paymentIntentId;
  if (!intentId) throw new Error('Payment has not been initiated');
  const status = observed || await getPaymentStatus({ provider, paymentId: intentId });
  assertCheckoutProviderObservation(status, order0.totalCents, order0.currencyCode);
  const finalized: any = await prisma.$transaction(async (raw: any) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, `event:${order0.eventId}`);
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    // An order cancelled when its unpaid hold lapsed can still receive a late payment; that must be recorded once.
    const lateAfterExpiry = order.status === 'cancelled' && !(await tx.payment.findUnique({ where: { idempotencyKey: `pi:${intentId}` } }));
    if (order.status !== 'pending_payment' && !lateAfterExpiry) return tx.ticketOrder.findUnique({ where: { id: orderId } }).then(() => ({ orderId, status: order.status, tickets: [] as any[], replay: true }));
    const hold = await tx.inventoryHold.findFirst({ where: { orderId }, include: { seats: { include: { seat: true } }, priceLevel: true } });
    if (!hold || hold.status !== 'active') {
      await appendAuditEvent(tx, null, { action: 'checkout.paid_without_hold', targetList: 'TicketOrder', targetId: orderId, reason: 'Provider payment succeeded after the hold was released; refund required' });
      await tx.ticketOrder.update({ where: { id: orderId }, data: { status: 'cancelled' } });
      const latePayment = await tx.payment.create({ data: { idempotencyKey: `pi:${intentId}`, amount: order.totalCents, currencyCode: order.currencyCode, status: 'succeeded', paymentProviderId: provider.id, providerPaymentId: intentId, orderId, paymentCollectionId: order.paymentCollectionId, processedAt: new Date(), cardLast4: status.card?.last4 || null, cardBrand: status.card?.brand || null, notes: 'Paid after hold release; refunded automatically' } });
      if (order.paymentCollectionId) await tx.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { authorizedAmount: Number(status.amount), metadata: { capturedAmount: Number(status.amount), providerStatus: status.status } } });
      return { orderId, status: 'cancelled', tickets: [] as any[], replay: false, late: { paymentId: latePayment.id, amount: order.totalCents, currency: order.currencyCode } } as any;
    }
    const q = hold.quoteSnapshot;
    const line = await tx.ticketOrderLine.create({ data: { orderId, title: q.eventTitle, levelName: q.levelName, phaseName: q.phaseName, seatLabel: (q.seats || []).map((s: any) => s.label).join(', '), unitPriceCents: q.unitPriceCents, serviceFeeCents: q.feeCents, facilityFeeCents: q.facilityFeeCents, taxCents: q.taxCents, quantity: hold.quantity, discountCents: q.discountCents, totalCents: q.totalCents, currencyCode: q.currencyCode, priceLevelId: hold.priceLevelId, phaseId: hold.phaseId } });
    const tokens: { ticketCode: string; token: string; seat: string }[] = [];
    for (let i = 0; i < hold.quantity; i++) {
      const ticketCode = humanCode('TK'); const token = ticketToken(ticketCode);
      const seat = hold.seats[i];
      await tx.ticket.create({ data: { orderId, eventId: hold.eventId, lineId: line.id, seatInventoryId: seat?.id, ticketCode, tokenHash: digest(token), holderName: order.guestName, holderEmail: order.guestEmail, status: 'valid' } });
      tokens.push({ ticketCode, token, seat: seat?.seat?.label || '' });
    }
    for (const seat of hold.seats) { const r = await tx.seatInventory.updateMany({ where: { id: seat.id, status: 'held', holdKey: hold.holdKey }, data: { status: 'sold', holdKey: '' } }); if (r.count !== 1) throw new Error('Seat is no longer held'); }
    const lvl = await tx.priceLevel.updateMany({ where: { id: hold.priceLevelId, held: { gte: hold.quantity } }, data: { held: { decrement: hold.quantity }, sold: { increment: hold.quantity } } });
    if (lvl.count !== 1) throw new Error('Level counters are inconsistent');
    if (hold.phaseId) await tx.priceLevelPhase.update({ where: { id: hold.phaseId }, data: { sold: { increment: hold.quantity } } });
    await tx.inventoryHold.update({ where: { id: hold.id }, data: { status: 'converted' } });
    await tx.promoRedemption.updateMany({ where: { holdId: hold.id, status: 'reserved' }, data: { status: 'committed' } });
    const redeemed = await tx.promoRedemption.findMany({ where: { holdId: hold.id, status: 'committed' } });
    for (const r of redeemed) await tx.promoCode.update({ where: { id: r.promoCodeId }, data: { usedCount: { increment: 1 } } });
    await tx.payment.create({ data: { idempotencyKey: `pi:${intentId}`, amount: order.totalCents, currencyCode: order.currencyCode, status: 'succeeded', paymentProviderId: provider.id, providerPaymentId: intentId, orderId, paymentCollectionId: order.paymentCollectionId, processedAt: new Date(), cardLast4: status.card?.last4 || null, cardBrand: status.card?.brand || null, data: { paymentIntentId: intentId } } });
    // The collection follows the provider: what it authorized and captured for this order.
    if (order.paymentCollectionId) await tx.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { authorizedAmount: Number(status.amount), metadata: { capturedAmount: Number(status.amount), providerStatus: status.status } } });
    await tx.paymentSession.update({ where: { id: session.id }, data: { paymentAuthorizedAt: new Date(), data: { ...session.data, state: 'completed', clientSecret: null } } });
    await tx.ticketOrder.update({ where: { id: orderId }, data: { status: 'paid' } });
    await appendAuditEvent(tx, null, { action: 'order.paid', targetList: 'TicketOrder', targetId: orderId, after: { totalCents: order.totalCents } });
    return { orderId, status: 'paid', orderNumber: order.orderNumber, tickets: tokens, replay: false };
  }, { timeout: 30000, isolationLevel: 'Serializable' });
  if (finalized.late) await refundLatePayment(context, provider, orderId, intentId, finalized.late);
  // The tickets go out by email when the order is first paid, whichever of the browser or the webhook gets there first.
  if (finalized.status === 'paid' && !finalized.replay) await deliverOrderConfirmation(context, orderId);
  return finalized;
}

/** Money arrived for an order whose hold had already lapsed: give it back. The provider key is stable, so a retry or a webhook replay cannot refund twice. */
async function refundLatePayment(context: any, provider: any, orderId: string, intentId: string, late: { paymentId: string; amount: number; currency: string }) {
  const prisma = context.prisma; const key = `late:${intentId}`;
  const refund = await prisma.refund.upsert({ where: { idempotencyKey: key }, update: {}, create: { idempotencyKey: key, amount: late.amount, currencyCode: late.currency, status: 'processing', reason: 'Payment arrived after the hold expired', paymentId: late.paymentId, orderId } });
  if (refund.status === 'succeeded') return;
  let result: any;
  try { result = await providerRefund({ provider, paymentId: intentId, amount: late.amount, currency: late.currency, idempotencyKey: key }); }
  catch { await prisma.refund.update({ where: { id: refund.id }, data: { status: 'unknown' } }); return; }
  const ok = result.status === 'succeeded';
  await prisma.refund.update({ where: { id: refund.id }, data: { status: ok ? 'succeeded' : result.status === 'failed' ? 'failed' : 'unknown', providerRefundId: result.id || '', processedAt: ok ? new Date() : null } });
  if (ok) {
    await prisma.payment.update({ where: { id: late.paymentId }, data: { refundedAmount: late.amount, status: 'refunded' } });
    const order = await prisma.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: late.amount } });
    if (order.paymentCollectionId) await prisma.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { refundedAmount: late.amount } });
  }
}

export async function completeTicketCheckout(_: any, { input }: any, context: any) {
  const order = await ownedOrder(context, input.orderId, input.proof);
  const provider = await stripeProvider(context);
  const result = await finalizePaidOrder(context, order.id, provider);
  // the webhook or an earlier call may have finished the order first: read the order as it now stands
  const saved = await guestOrder(context, { id: order.id });
  return { ...saved!.view, status: result.status, proof: createProof(order.id) };
}

// What a guest sees of their own order: the show, the money and each ticket with its seat.
async function guestOrder(context: any, where: any) {
  const o = await context.prisma.ticketOrder.findUnique({ where, include: { event: { select: { id: true, title: true, showAt: true, doorsAt: true, ageRestriction: true, venue: { select: { name: true, address: true, city: true, timezone: true } } } }, ticket_order: { select: { ticketCode: true, tokenHash: true, status: true, holderName: true, seatInventory: { select: { seat: { select: { label: true } } } } }, orderBy: { ticketCode: 'asc' } }, ticketOrderLine_order: true } });
  if (!o) return null;
  return { guestEmail: o.guestEmail, view: { orderId: o.id, orderNumber: o.orderNumber, status: o.status, guestName: o.guestName, subtotalCents: o.subtotalCents, serviceFeesCents: o.serviceFeesCents, facilityFeesCents: o.facilityFeesCents, taxCents: o.taxCents, discountCents: o.discountCents, totalCents: o.totalCents, refundedCents: o.refundedCents, currencyCode: o.currencyCode, event: o.event, createdAt: o.createdAt, source: o.source, tickets: o.ticket_order.map((t: any) => ({ ticketCode: t.ticketCode, status: t.status, holderName: t.holderName, seat: t.seatInventory?.seat?.label || '', scan: t.status === 'valid' || t.status === 'checked_in' ? ticketScanValue(t) : '' })), lines: o.ticketOrderLine_order } };
}

export async function lookupTicketOrder(_: any, { email, orderNumber }: any, context: any) {
  const o = await guestOrder(context, { orderNumber: String(orderNumber || '').trim().toUpperCase() });
  // Same response shape for unknown order and wrong email.
  if (!o || o.guestEmail !== String(email || '').trim().toLowerCase()) throw new Error('Order not found');
  return { ...o.view, proof: createProof(o.view.orderId, Math.floor(Date.now() / 1000) + 86400) };
}

/** The order page: opened with the signed link from the email, checkout or lookup on any device, or by its signed-in buyer. */
export async function ticketOrderView(_: any, { orderId, proof }: any, context: any) {
  const order = await ownedOrder(context, String(orderId || ''), proof);
  const o = await guestOrder(context, { id: order.id });
  // A signed-in buyer without a link still gets a short proof, so sending a ticket on works from the account.
  return { ...o!.view, proof: proof && verifyProof(proof, order.id) ? proof : createProof(order.id, Math.floor(Date.now() / 1000) + 3600) };
}

/** Order history for the signed-in customer: orders bought while signed in, and guest orders bought with their confirmed email. */
export async function myTicketOrders(_: any, __: any, context: any) {
  const id = context.session?.itemId;
  if (!id) throw new Error('Sign in to see your orders');
  const user = await context.prisma.user.findUnique({ where: { id }, select: { email: true, emailVerifiedAt: true } });
  if (!user) throw new Error('Sign in to see your orders');
  const mine: any[] = [{ customerId: id }];
  if (user.emailVerifiedAt) mine.push({ guestEmail: user.email.toLowerCase() });
  const rows = await context.prisma.ticketOrder.findMany({ where: { OR: mine, status: { in: ['paid', 'partially_refunded', 'refunded', 'comp'] } }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, orderNumber: true, status: true, totalCents: true, refundedCents: true, currencyCode: true, createdAt: true, event: { select: { id: true, title: true, showAt: true, venue: { select: { name: true, city: true, timezone: true } } } }, _count: { select: { ticket_order: { where: { status: { in: ['valid', 'checked_in'] } } } } } } });
  return rows.map((o: any) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, totalCents: o.totalCents, refundedCents: o.refundedCents, currencyCode: o.currencyCode, createdAt: o.createdAt, event: o.event, ticketCount: o._count.ticket_order }));
}

/** Staff send the confirmation email again, for a buyer who cannot find theirs. */
export async function resendOrderConfirmation(_: any, { orderId }: any, context: any) {
  if (!permissions.canManageOrders({ session: context.session }) && !permissions.canIssueRefunds({ session: context.session })) throw new Error(permissionRefusal('canManageOrders'));
  const order = await context.prisma.ticketOrder.findUnique({ where: { id: String(orderId || '') } });
  if (!order) throw new Error('Order not found');
  if (!order.guestEmail) throw new Error('This order has no email address');
  const result = await deliverOrderConfirmation(context, order.id, { force: true });
  if (!result.sent) throw new Error(result.error || 'The email could not be sent');
  await appendAuditEvent(context.prisma, context.session.itemId, { action: 'order.confirmation_resent', targetList: 'TicketOrder', targetId: order.id, after: { to: order.guestEmail, messageId: result.messageId || null } });
  return { sent: true, to: order.guestEmail, messageId: result.messageId || null };
}

export async function transferTicket(_: any, { input }: any, context: any) {
  const { ticketCode, orderId, proof, toEmail, toName, idempotencyKey } = input;
  if (!idempotencyKey) throw new Error('Idempotency key required');
  const order = await ownedOrder(context, orderId, proof);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail || '')) throw new Error('Valid recipient email required');
  const moved = await command(context, { operation: 'transferTicket', idempotencyKey, lock: `event:${order.eventId}`, params: { ticketCode, orderId, toEmail, toName } }, async tx => {
    const old = await tx.ticket.findUnique({ where: { ticketCode } });
    if (!old || old.orderId !== order.id || old.status !== 'valid') throw new Error('Ticket cannot be transferred');
    const moved = await tx.ticket.updateMany({ where: { id: old.id, status: 'valid' }, data: { status: 'transferred', tokenHash: '' } });
    if (moved.count !== 1) throw new Error('Ticket cannot be transferred');
    const code = humanCode('TK'); const token = ticketToken(code);
    const fresh = await tx.ticket.create({ data: { orderId: old.orderId, eventId: old.eventId, lineId: old.lineId, seatInventoryId: old.seatInventoryId, ticketCode: code, tokenHash: digest(token), holderName: toName || '', holderEmail: toEmail.toLowerCase(), status: 'valid', transferredFromId: old.id } });
    await appendAuditEvent(tx, context.session?.itemId, { action: 'ticket.transferred', targetList: 'Ticket', targetId: fresh.id, before: { ticketCode }, after: { ticketCode: code } });
    return { ticketCode: code, token, status: 'valid' };
  });
  // The new holder gets the ticket by email; the page says whether that email went out.
  const mail = await sendTransferEmail(context, { orderId: order.id, ticketCode: moved.ticketCode, fromCode: ticketCode });
  return { ...moved, emailed: mail.sent };
}

export async function refundTicketOrder(_: any, { input }: any, context: any) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error(permissionRefusal('canIssueRefunds'));
  const { orderId, reason, idempotencyKey, approvalId } = input;
  if (!idempotencyKey || !String(reason || '').trim()) throw new Error('Reason and idempotency key required');
  const actor = context.session.itemId; const prisma = context.prisma;
  const provider = await stripeProvider(context);
  const reserve = await command(context, { operation: 'refundTicketOrder', idempotencyKey, lock: `event:${(await prisma.ticketOrder.findUnique({ where: { id: orderId } }))?.eventId}`, params: { orderId, amountCents: input.amountCents ?? null, reason, approvalId: approvalId ?? null } }, async tx => {
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    if (!order || !['paid', 'partially_refunded'].includes(order.status)) throw new Error('Order is not refundable');
    const payment = await tx.payment.findFirst({ where: { orderId, status: { in: ['succeeded', 'partially_refunded'] } } });
    if (!payment) throw new Error('No captured payment');
    if (!payment.providerPaymentId) throw new Error('Cash and terminal sales are refunded at the box office, not through Stripe');
    const outstanding = await tx.refund.findMany({ where: { paymentId: payment.id, status: { in: ['processing', 'unknown', 'succeeded'] } } });
    const available = payment.amount - outstanding.reduce((n: number, r: any) => n + r.amount, 0);
    refundableCents(order.totalCents, order.totalCents - available);
    const amount = input.amountCents ?? available;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > available) throw new Error('Refund exceeds unrefunded balance');
    const settings = await tx.storeSettings.findFirst();
    const threshold = settings?.refundApprovalThresholdCents ?? 0;
    let approvedById: string | null = null;
    if (amount > threshold) {
      // Approval is bound to this order, exact amount and reason, and consumed in this same transaction.
      if (!approvalId) throw new Error('A different manager must approve this refund');
      const approval = await tx.managerApproval.findUnique({ where: { id: approvalId } });
      assertApprovalUsable(approval, { actorId: actor, fingerprint: refundApprovalFingerprint(refundApprovalPayload(orderId, amount, reason)) });
      const consumed = await tx.managerApproval.updateMany({ where: { id: approvalId, status: 'approved', expiresAt: { gt: new Date() } }, data: { status: 'consumed', consumedAt: new Date(), consumedEntityType: 'TicketOrder', consumedEntityId: orderId } });
      if (consumed.count !== 1) throw new Error('Approval was already used or expired');
      approvedById = approval.approvedById;
    }
    const refund = await tx.refund.create({ data: { idempotencyKey: `refund:${idempotencyKey}`, amount, currencyCode: payment.currencyCode, status: 'processing', reason, paymentId: payment.id, orderId, requestedById: actor, approvedById } });
    await appendAuditEvent(tx, actor, { action: 'refund.reserved', targetList: 'Refund', targetId: refund.id, after: { amount }, reason });
    return { refundId: refund.id, amount, paymentId: payment.id, providerPaymentId: payment.providerPaymentId, currency: payment.currencyCode, full: amount === order.totalCents - order.refundedCents, key: refund.idempotencyKey };
  });
  let result: any;
  try {
    result = await providerRefund({ provider, paymentId: reserve.providerPaymentId, amount: reserve.amount, currency: reserve.currency, idempotencyKey: reserve.key });
  } catch (error) {
    await prisma.refund.update({ where: { id: reserve.refundId }, data: { status: 'unknown' } });
    throw error;
  }
  return finishTicketRefund(context, { refundId: reserve.refundId, paymentId: reserve.paymentId, orderId, actor, reason }, result);
}

/** Applies the provider's answer to a reserved refund: once, under the event lock. */
async function finishTicketRefund(context: any, { refundId, paymentId, orderId, actor, reason }: { refundId: string; paymentId: string; orderId: string; actor: string | null; reason: string }, result: any) {
  const prisma = context.prisma;
  const ok = result.status === 'succeeded';
  return prisma.$transaction(async (raw: any) => {
    const tx = checkedClient(raw);
    const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
    await lockTransactionKey(tx, `event:${order.eventId}`);
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (refund.status === 'succeeded') return { refundId: refund.id, status: 'succeeded' };
    await tx.refund.update({ where: { id: refund.id }, data: { status: ok ? 'succeeded' : result.status === 'failed' ? 'failed' : 'unknown', providerRefundId: result.id || '', providerData: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined, processedAt: ok ? new Date() : null } });
    if (!ok) return { refundId: refund.id, status: result.status === 'failed' ? 'failed' : 'unknown' };
    const rows = await tx.refund.findMany({ where: { paymentId: paymentId } });
    const total = successfulRefundTotal(rows);
    await tx.payment.update({ where: { id: paymentId }, data: { refundedAmount: total, status: total >= order.totalCents ? 'refunded' : 'partially_refunded' } });
    const full = total >= order.totalCents;
    await tx.ticketOrder.update({ where: { id: orderId }, data: { refundedCents: total, status: full ? 'refunded' : 'partially_refunded' } });
    if (order.paymentCollectionId) await tx.paymentCollection.update({ where: { id: order.paymentCollectionId }, data: { refundedAmount: total } });
    if (full) {
      const tickets = await tx.ticket.findMany({ where: { orderId, status: { in: ['valid', 'checked_in'] } } });
      for (const t of tickets) {
        await tx.ticket.update({ where: { id: t.id }, data: { status: 'refunded', tokenHash: '' } });
        if (t.seatInventoryId) await tx.seatInventory.updateMany({ where: { id: t.seatInventoryId, status: 'sold' }, data: { status: 'open', occupancyKey: null } });
      }
      const lines = await tx.ticketOrderLine.findMany({ where: { orderId } });
      for (const l of lines) {
        await tx.priceLevel.update({ where: { id: l.priceLevelId }, data: { sold: { decrement: l.quantity } } });
        if (l.phaseId) await tx.priceLevelPhase.update({ where: { id: l.phaseId }, data: { sold: { decrement: l.quantity } } });
      }
    }
    await appendAuditEvent(tx, actor, { action: 'refund.succeeded', targetList: 'Refund', targetId: refund.id, after: { total }, reason });
    return { refundId: refund.id, status: 'succeeded', notify: { amount: refund.amount, full } };
  }, { timeout: 30000, isolationLevel: 'Serializable' }).then(async (done: any) => {
    const { notify, ...answer } = done;
    if (notify) await sendRefundEmail(context, { orderId, amountCents: notify.amount, full: notify.full });
    return answer;
  });
}

/** Staff retry of a refund left processing or unknown: the same Stripe key, so the money moves at most once. */
export async function retryTicketRefund(_: any, { input }: any, context: any) {
  if (!permissions.canIssueRefunds({ session: context.session })) throw new Error(permissionRefusal('canIssueRefunds'));
  const prisma = context.prisma;
  const refund = await prisma.refund.findUnique({ where: { id: String(input.refundId || '') }, include: { payment: true } });
  if (!refund || !['processing', 'unknown'].includes(refund.status) || !refund.payment?.providerPaymentId) throw new Error('Only a card refund that is still being confirmed can be retried');
  const provider = await stripeProvider(context);
  const intentId = refund.payment.providerPaymentId;
  if (refund.idempotencyKey.startsWith('late:')) {
    await refundLatePayment(context, provider, refund.orderId, intentId, { paymentId: refund.paymentId, amount: refund.amount, currency: refund.currencyCode });
    const after = await prisma.refund.findUnique({ where: { id: refund.id } });
    return { refundId: refund.id, status: after.status };
  }
  // look for the refund at Stripe first: a key older than a day no longer dedupes there
  const status = await getPaymentStatus({ provider, paymentId: intentId });
  const sent = (status.refunds || []).find((r: any) => r.metadata?.restaurantRefundKey === refund.idempotencyKey);
  const result = sent ? { id: sent.id, status: sent.status, data: sent } : await providerRefund({ provider, paymentId: intentId, amount: refund.amount, currency: refund.currencyCode, idempotencyKey: refund.idempotencyKey });
  return finishTicketRefund(context, { refundId: refund.id, paymentId: refund.paymentId, orderId: refund.orderId, actor: context.session.itemId, reason: refund.reason }, result);
}

export async function handleProviderWebhook(context: any, providerCode: string, rawBody: string, headers: Record<string, string>) {
  const provider = await stripeProvider(context);
  if (provider.code !== providerCode) throw new Error('Unknown provider');
  const event = JSON.parse(rawBody);
  const parsed = await handleWebhook({ provider, event, headers, rawBody });
  if (!parsed?.isValid) throw new Error('Webhook verification failed');
  const eventKey = `${providerCode}:${parsed.event.id}`;
  const prisma = context.prisma;
  const existing = await prisma.paymentWebhookEvent.findUnique({ where: { eventKey } });
  if (existing?.status === 'processed') return { success: true };
  const inbox = existing || await prisma.paymentWebhookEvent.create({ data: { eventKey, providerCode, providerEventId: parsed.event.id, eventType: parsed.type, status: 'received', payload: event, rawBody } });
  try {
    if (webhookPaymentStatus(parsed.type) === 'succeeded') {
      const intentId = parsed.resource?.id;
      const session = await prisma.paymentSession.findFirst({ where: { paymentProviderId: provider.id, data: { path: ['paymentIntentId'], equals: intentId } } });
      const order = session && await prisma.ticketOrder.findFirst({ where: { paymentCollectionId: session.paymentCollectionId } });
      if (!order) {
        // Fleet Stripe endpoints share an account. A valid event for another site must be
        // acknowledged, not retried forever. Our intents always carry this order's id.
        const claimedId = parsed.resource?.metadata?.orderId;
        const claimedOrder = typeof claimedId === 'string' && claimedId
          ? await prisma.ticketOrder.findUnique({ where: { id: claimedId }, select: { id: true } }) : null;
        if (claimedOrder) throw new Error('Payment correlation pending');
      } else {
        await finalizePaidOrder(context, order.id, provider);
      }
    }
    await prisma.paymentWebhookEvent.update({ where: { id: inbox.id }, data: { status: 'processed', processedAt: new Date(), attempts: { increment: 1 } } });
  } catch (error: any) {
    await prisma.paymentWebhookEvent.updateMany({ where: { id: inbox.id, status: { notIn: ['processed'] } }, data: { status: 'failed', error: error.message, attempts: { increment: 1 } } });
    throw error;
  }
  return { success: true };
}
