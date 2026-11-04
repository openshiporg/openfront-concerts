'use client';
import { ActionButton } from '../../components/ActionButton';

export function HoldActions({ holdId, status }: { holdId: string; status: string }) {
  if (!['held', 'challenged'].includes(status)) return null;
  return <div className="flex flex-wrap gap-2">
    {status === 'held' ? <ActionButton command="challengeHold" input={{ holdId }}>Challenge</ActionButton> : null}
    <ActionButton command="releaseDateHold" input={{ holdId, reason: 'Released by promoter' }}>Release hold</ActionButton>
  </div>;
}
