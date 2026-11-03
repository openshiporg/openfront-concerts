'use client';
import { ActionButton } from '../../components/ActionButton';

const NEXT: Record<string, string> = { draft: 'Mark reviewed', reviewed: 'Sign as promoter', signed_promoter: 'Sign for artist', signed_artist: 'Finalize' };
export function SettlementActions({ settlementId, eventId, status }: { settlementId: string; eventId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {NEXT[status] ? <ActionButton command="signSettlement" variant="default" input={{ settlementId }}>{NEXT[status]}</ActionButton> : null}
      {['draft', 'reviewed'].includes(status) ? <ActionButton command="computeSettlement" input={{ eventId }}>Recompute</ActionButton> : null}
    </div>
  );
}
