import { appendAuditEvent } from './audit';
import { getOrCreateIdempotencyAttempt, updateIdempotencyAttempt } from '../utils/idempotency';

/** Gym classCapacity advisory lock pattern; every inventory writer participates. */
export async function lockTransactionKey(tx: any, key: string) {
  const result = await tx.$queryRaw`SELECT true AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))) AS acquired`;
  if (result instanceof Error) throw result;
}
export function checkedClient(prisma: any): any {
  return new Proxy(prisma, { get(target, key) {
    const value = target[key];
    if (typeof value === 'function') return async (...args: any[]) => { const result = await value.apply(target, args); if (result instanceof Error) throw result; return result; };
    if (value && typeof value === 'object') return checkedClient(value);
    return value;
  } });
}
export async function command(context: any, input: { operation: string; idempotencyKey: string; lock: string; params: any }, run: (tx: any) => Promise<any>) {
  return context.prisma.$transaction(async (raw: any) => {
    const tx = checkedClient(raw);
    await lockTransactionKey(tx, input.lock);
    const actor = context.session?.itemId || null;
    const { attempt, replay } = await getOrCreateIdempotencyAttempt(tx, { key: input.idempotencyKey, requestPath: input.operation, requestParams: { ...input.params, actor } });
    if (replay && attempt.recoveryPoint === 'completed') return attempt.responseBody;
    const result = await run(tx);
    await updateIdempotencyAttempt(tx, attempt.id, 'completed', result, 200);
    return result;
  }, { timeout: 30000 });
}
export async function transition(tx: any, model: string, id: string, expected: string, next: string, actor: string | null, reason = '', extra: any = {}) {
  const count = await tx[model].updateMany({ where: { id, status: expected }, data: { status: next, ...extra } });
  if (count.count !== 1) throw new Error(`Invalid ${model} transition from ${expected}`);
  await appendAuditEvent(tx, actor, { action: `${expected}:${next}`, targetList: model, targetId: id, before: { status: expected }, after: { status: next, ...extra }, reason });
  return tx[model].findUnique({ where: { id } });
}
