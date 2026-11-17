'use client';
import { ActionButton } from '../../components/ActionButton';
import { ArtistPaymentEditor, AdjustmentEditor } from '../../events/components/SettlementInputs';

const NEXT: Record<string, string> = { draft: 'Mark reviewed', reviewed: 'Sign as promoter', signed_promoter: 'Sign for artist', signed_artist: 'Finalize' };
export function SettlementActions({ settlementId, eventId, status, dueCents = 0, latest = true, approvers = [] }: { settlementId: string; eventId: string; status: string; dueCents?: number; latest?: boolean; approvers?: { id: string; name: string }[] }) {
  if (!latest) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {NEXT[status] ? <ActionButton command="signSettlement" variant="default" input={{ settlementId }}>{NEXT[status]}</ActionButton> : null}
      {['draft', 'reviewed'].includes(status) ? <ActionButton command="computeSettlement" input={{ eventId }}>Recompute</ActionButton> : null}
      {status === 'final' && dueCents > 0 ? <ArtistPaymentEditor settlementId={settlementId} dueCents={dueCents} /> : null}
      {['signed_promoter', 'signed_artist', 'final'].includes(status) ? <AdjustmentEditor settlementId={settlementId} approvers={approvers} /> : null}
    </div>
  );
}
