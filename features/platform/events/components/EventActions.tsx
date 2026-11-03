'use client';
import { ActionButton } from '../../components/ActionButton';

export function EventActions({ eventId, status }: { eventId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'hold' ? <ActionButton command="publishEvent" input={{ eventId }}>Publish</ActionButton> : null}
      {['announced', 'presale', 'on_sale', 'sold_out'].includes(status) ? <ActionButton command="postponeEvent" input={{ eventId }}>Postpone</ActionButton> : null}
      {!['cancelled', 'settled', 'completed', 'settling'].includes(status) ? <ActionButton command="cancelEvent" variant="destructive" input={{ eventId, reason: 'Cancelled by promoter' }}>Cancel</ActionButton> : null}
    </div>
  );
}
