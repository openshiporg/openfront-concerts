'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionButton } from '../../components/ActionButton';
import { runCommand } from '../../lib/commands';

/** Offer stages: draft → sent → accepted (terms frozen) → contracted, or sent → declined. */
export function OfferActions({ offerId, status }: { offerId: string; status: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'' | 'decline' | 'contract'>('');
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!['draft', 'sent', 'accepted'].includes(status)) return null;
  const submit = async () => {
    setPending(true); setError('');
    try {
      await runCommand(mode === 'decline' ? 'declineOffer' : 'contractOffer', mode === 'decline' ? { offerId, reason: text.trim() } : { offerId, reference: text.trim() });
      setMode(''); setText(''); router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setPending(false); }
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' ? <ActionButton command="sendOffer" input={{ offerId }}>Send offer</ActionButton> : null}
        {status === 'sent' ? <ActionButton command="acceptOffer" variant="default" input={{ offerId }}>Mark accepted</ActionButton> : null}
        {status === 'sent' && !mode ? <Button size="sm" variant="outline" onClick={() => setMode('decline')}>Decline</Button> : null}
        {status === 'accepted' && !mode ? <Button size="sm" variant="outline" onClick={() => setMode('contract')}>Record contract</Button> : null}
      </div>
      {mode ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-80">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'decline' ? 'Decline reason' : 'Contract reference'} aria-label={mode === 'decline' ? 'Decline reason' : 'Contract reference'} className="min-w-0 flex-1" />
          <Button size="sm" disabled={pending || !text.trim()} onClick={submit}>{pending ? 'Working…' : mode === 'decline' ? 'Decline' : 'Save'}</Button>
          <Button size="sm" variant="outline" onClick={() => { setMode(''); setError(''); }}>Close</Button>
        </div>
      ) : null}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
