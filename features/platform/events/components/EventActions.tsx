'use client';
import { ActionButton } from '../../components/ActionButton';
import { eventTransitions, eventTransitionLabels } from '@/features/keystone/lib/event-lifecycle';

export function EventActions({ eventId, status }: { eventId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(eventTransitions[status] || []).map(next => <ActionButton key={next} command="advanceEvent" input={{ eventId, status: next, ...(status === 'postponed' ? { reason: 'Resumed by promoter' } : {}) }}>{eventTransitionLabels[next]}</ActionButton>)}
      {status === 'hold' ? <ActionButton command="publishEvent" input={{ eventId }}>Publish</ActionButton> : null}
      {['announced', 'presale', 'on_sale', 'sold_out'].includes(status) ? <ActionButton command="postponeEvent" input={{ eventId }}>Postpone</ActionButton> : null}
      {!['cancelled', 'settled', 'completed', 'settling'].includes(status) ? <ActionButton command="cancelEvent" variant="destructive" input={{ eventId, reason: 'Cancelled by promoter' }}>Cancel</ActionButton> : null}
    </div>
  );
}
