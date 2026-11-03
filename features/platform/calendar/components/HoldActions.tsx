'use client';
import { ActionButton } from '../../components/ActionButton';

export function HoldActions({ holdId, status }: { holdId: string; status: string }) {
  return status === 'held' ? <ActionButton command="challengeHold" input={{ holdId }}>Challenge</ActionButton> : null;
}
