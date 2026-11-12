import { permissions } from '../access';
import { command } from '../lib/transaction';
import { appendAuditEvent } from '../lib/audit';
import { assertFloat, countedFromSheet, closeOut, drawerOpenKey, overrideReason } from '../lib/cash-drawer';

/** Box-office drawer shifts: one open drawer per cashier; door cash in and cash refunds out are booked to it. */
function guard(context: any, input: any) {
  if (!permissions.canManageOrders({ session: context.session })) throw new Error('Permission required: canManageOrders');
  if (!input?.idempotencyKey) throw new Error('Idempotency key required');
  return context.session.itemId as string;
}

export async function openCashDrawer(_: any, { input }: any, context: any) {
  const actor = guard(context, input);
  const label = String(input.label || '').trim();
  if (!label || label.length > 60) throw new Error('Drawer name required');
  const float = assertFloat(input.openingFloatCents);
  return command(context, { operation: 'openCashDrawer', idempotencyKey: input.idempotencyKey, lock: `drawer:${actor}`, params: { label, float } }, async tx => {
    if (await tx.cashDrawer.findUnique({ where: { openKey: drawerOpenKey(actor) } })) throw new Error('You already have an open drawer; close it first');
    const row = await tx.cashDrawer.create({ data: { label, status: 'open', openKey: drawerOpenKey(actor), openingFloatCents: float, openedAt: new Date(), openedById: actor } });
    await appendAuditEvent(tx, actor, { action: 'drawer.opened', targetList: 'CashDrawer', targetId: row.id, after: { label, openingFloatCents: float } });
    return { id: row.id, status: 'open' };
  });
}

/** Blind close: the cashier counts by denomination; expected and variance are revealed after closing. */
export async function closeCashDrawer(_: any, { input }: any, context: any) {
  const actor = guard(context, input);
  const counted = countedFromSheet(input.count);
  const reason = String(input.reason || '').trim();
  return command(context, { operation: 'closeCashDrawer', idempotencyKey: input.idempotencyKey, lock: `drawer:${actor}`, params: { drawerId: input.drawerId, count: input.count, reason } }, async tx => {
    // Close first: from here a concurrent sale's guarded increment (status: open) finds nothing and refuses.
    const closed = await tx.cashDrawer.updateMany({ where: { id: input.drawerId, status: 'open', openedById: actor }, data: { status: 'closed', openKey: null, closedAt: new Date(), closedById: actor } });
    if (closed.count !== 1) throw new Error('Only your own open drawer can be closed');
    const d = await tx.cashDrawer.findUnique({ where: { id: input.drawerId } });
    const { expectedCents, varianceCents } = closeOut(d, counted, reason);
    await tx.cashDrawer.update({ where: { id: d.id }, data: { countedCents: counted, expectedCents, varianceCents, varianceReason: reason, count: input.count } });
    await appendAuditEvent(tx, actor, { action: 'drawer.closed', targetList: 'CashDrawer', targetId: d.id, after: { countedCents: counted, expectedCents, varianceCents }, reason });
    return { id: d.id, status: 'closed', countedCents: counted, expectedCents, varianceCents };
  });
}

/** A manager (canApproveAdjustments) closes another cashier's open drawer with their own blind count and a stated reason. */
export async function forceCloseCashDrawer(_: any, { input }: any, context: any) {
  if (!permissions.canApproveAdjustments({ session: context.session })) throw new Error('Permission required: canApproveAdjustments');
  if (!input?.idempotencyKey) throw new Error('Idempotency key required');
  const actor = context.session.itemId as string;
  const counted = countedFromSheet(input.count);
  const reason = overrideReason(input.reason);
  const found = await context.prisma.cashDrawer.findUnique({ where: { id: String(input.drawerId) }, select: { openedById: true } });
  if (!found?.openedById) throw new Error('Drawer not found');
  if (found.openedById === actor) throw new Error('Close your own drawer from the Cash drawer panel');
  // Same lock as the cashier's own close, so the two cannot interleave.
  return command(context, { operation: 'forceCloseCashDrawer', idempotencyKey: input.idempotencyKey, lock: `drawer:${found.openedById}`, params: { drawerId: input.drawerId, count: input.count, reason } }, async tx => {
    const closed = await tx.cashDrawer.updateMany({ where: { id: input.drawerId, status: 'open', openedById: found.openedById }, data: { status: 'closed', openKey: null, closedAt: new Date(), closedById: actor } });
    if (closed.count !== 1) throw new Error('That drawer is no longer open');
    const d = await tx.cashDrawer.findUnique({ where: { id: input.drawerId } });
    const { expectedCents, varianceCents } = closeOut(d, counted, reason);
    await tx.cashDrawer.update({ where: { id: d.id }, data: { countedCents: counted, expectedCents, varianceCents, varianceReason: reason, count: input.count } });
    await appendAuditEvent(tx, actor, { action: 'drawer.closed_by_manager', targetList: 'CashDrawer', targetId: d.id, before: { openedById: found.openedById }, after: { countedCents: counted, expectedCents, varianceCents }, reason });
    return { id: d.id, status: 'closed', countedCents: counted, expectedCents, varianceCents };
  });
}

/** Inside the caller's transaction: book cash to the actor's open drawer or refuse. */
export async function bookDrawer(tx: any, actor: string, field: 'cashSalesCents' | 'cashRefundsCents', cents: number) {
  const drawer = await tx.cashDrawer.findUnique({ where: { openKey: drawerOpenKey(actor) } });
  if (!drawer) throw new Error('Open a cash drawer first');
  const r = await tx.cashDrawer.updateMany({ where: { id: drawer.id, status: 'open' }, data: { [field]: { increment: cents } } });
  if (r.count !== 1) throw new Error('Cash drawer was closed; open a drawer');
  return drawer.id as string;
}
