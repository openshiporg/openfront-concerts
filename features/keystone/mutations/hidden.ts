import { permissions } from '../access';
import { appendAuditEvent } from '../lib/audit';

/**
 * Hide or unhide a test order or account. Hidden records stay in the database (fleet rule: never delete),
 * and every staff list, customer list and report filters them out. Owner/Admin only; audited.
 */
export async function setRecordHidden(_: any, { list, id, hidden, reason }: { list: string; id: string; hidden: boolean; reason?: string }, context: any) {
  if (!permissions.canManagePeople({ session: context.session })) throw new Error('Only staff who manage people can hide records');
  const model = list === 'TicketOrder' ? 'ticketOrder' : list === 'User' ? 'user' : null;
  if (!model) throw new Error('Only orders and accounts can be hidden');
  if (model === 'user' && id === context.session.itemId && hidden) throw new Error('You cannot hide your own account');
  const before = await context.prisma[model].findUnique({ where: { id: String(id) }, select: { id: true, hiddenAt: true } });
  if (!before) throw new Error('Record not found');
  const hiddenAt = hidden ? before.hiddenAt || new Date() : null;
  await context.prisma[model].update({ where: { id: before.id }, data: { hiddenAt } });
  await appendAuditEvent(context.prisma, context.session.itemId, { action: hidden ? 'record.hidden' : 'record.unhidden', targetList: list, targetId: before.id, before: { hiddenAt: before.hiddenAt }, after: { hiddenAt }, reason: String(reason || '').slice(0, 500) });
  return { id: before.id, hiddenAt };
}
