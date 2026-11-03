import crypto from 'node:crypto';

/** Adapted from Restaurant appendAuditEventWithClient; use the caller's transaction. */
export async function appendAuditEvent(tx: any, actorId: string | null | undefined, input: {
  action: string; targetList: string; targetId: string; before?: unknown; after?: unknown;
  reason?: string; requestId?: string;
}) {
  const result = await tx.auditEvent.create({ data: {
    ...input, actorId: actorId || null, requestId: input.requestId || crypto.randomUUID(),
    before: input.before ?? undefined, after: input.after ?? undefined,
  } });
  if (result instanceof Error) throw result;
  return result;
}
