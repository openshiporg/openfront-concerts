'use client';
import { ActionButton } from '../../components/ActionButton';
import { eventTransitionLabels } from '@/features/keystone/lib/event-lifecycle';

export function EventActions({ eventId, status, steps }: { eventId: string; status: string; steps: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map(next => <ActionButton key={next} command="advanceEvent" input={{ eventId, status: next, ...(status === 'postponed' ? { reason: 'Resumed by promoter' } : {}) }}>{eventTransitionLabels[next]}</ActionButton>)}
      {status === 'hold' ? <ActionButton command="publishEvent" input={{ eventId }}>Publish</ActionButton> : null}
      {['announced', 'presale', 'on_sale', 'sold_out'].includes(status) ? <ActionButton command="postponeEvent" input={{ eventId }}>Postpone</ActionButton> : null}
      {!['cancelled', 'settled', 'completed', 'settling'].includes(status) ? <ActionButton command="cancelEvent" confirm="Cancel this show? Sales will stop and active checkout holds will be released." input={{ eventId, reason: 'Cancelled by promoter' }}>Cancel show</ActionButton> : null}
    </div>
  );
}
