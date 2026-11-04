'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runTyped } from '../../lib/commands';

type Approval = { id: string; targetId: string; amount: number; reason: string; status: string };

/** Over-threshold refunds need an approved request bound to this order, exact amount and reason. */
export function RefundPanel({ orderId, refundableCents, thresholdCents, approvals }: { orderId: string; refundableCents: number; thresholdCents: number; approvals: Approval[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [dollars, setDollars] = useState((refundableCents / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  if (refundableCents < 1) return null;
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Refund</Button>;
  const cents = Math.round(Number(dollars) * 100);
  const valid = Number.isSafeInteger(cents) && cents >= 1 && cents <= refundableCents && reason.trim().length > 0;
  const needsApproval = cents > thresholdCents;
  const match = approvals.find((a) => a.targetId === orderId && a.amount === cents && a.reason === reason.trim() && a.status === 'approved');
  const waiting = approvals.find((a) => a.targetId === orderId && a.amount === cents && a.reason === reason.trim() && a.status === 'pending');
  const run = () => start(async () => {
    setError(''); setMessage('');
    try {
      if (needsApproval && !match) {
        await runTyped('requestRefundApproval', 'RefundApprovalRequestInput', { orderId, amountCents: cents, reason: reason.trim() });
        setMessage('Approval requested. A different manager must approve it.');
      } else {
        const result = await runTyped('refundTicketOrder', 'RefundTicketOrderInput', { orderId, amountCents: cents, reason: reason.trim(), idempotencyKey: key, ...(match ? { approvalId: match.id } : {}) });
        setMessage(result.status === 'succeeded' ? 'Refunded.' : `Refund ${result.status}.`);
        setKey(crypto.randomUUID());
      }
      router.refresh();
    } catch (e: any) { setError(e.message); }
  });
  return (
    <div className="mt-2 flex w-full flex-col gap-2 sm:max-w-sm">
      <Input value={dollars} onChange={(e) => setDollars(e.target.value)} inputMode="decimal" aria-label="Refund amount in dollars" />
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Refund reason" />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending || !valid || Boolean(waiting)} onClick={run}>{pending ? 'Working…' : needsApproval && !match ? 'Request approval' : 'Issue refund'}</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
      </div>
      {waiting ? <span className="text-sm text-muted-foreground">Awaiting manager approval.</span> : null}
      {match ? <span className="text-sm text-muted-foreground">Approved. Ready to issue.</span> : null}
      {message ? <span className="text-sm">{message}</span> : null}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
