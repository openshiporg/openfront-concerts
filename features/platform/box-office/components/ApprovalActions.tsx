'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { runTyped } from '../../lib/commands';

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const decide = (decision: 'approve' | 'reject') => start(async () => {
    setError('');
    try { await runTyped('decideRefundApproval', 'RefundApprovalDecisionInput', { approvalId, decision }); router.refresh(); }
    catch (e: any) { setError(e.message); }
  });
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide('approve')}>Approve</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => decide('reject')}>Reject</Button>
      </span>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </span>
  );
}
