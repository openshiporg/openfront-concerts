'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { runCommand } from '../../lib/commands';
import { CameraScan } from './CameraScan';

const RESULT: Record<string, { title: string; tone: string }> = {
  admitted: { title: 'Admit', tone: 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' },
  reentry: { title: 'Re-entry: admit', tone: 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' },
  duplicate: { title: 'Already scanned', tone: 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' },
  void: { title: 'Not valid: refunded or sent on', tone: 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' },
  wrong_event: { title: 'Ticket for another show', tone: 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100' },
};

/** A QR scan carries the ticket's 64-character secret; anything else is a printed ticket code. */
const asInput = (raw: string) => (/^[0-9a-f]{64}$/i.test(raw) ? { token: raw.toLowerCase() } : { ticketCode: raw.toUpperCase() });

export function ScanConsole({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [code, setCode] = useState(''); const [gate, setGate] = useState('Main'); const [last, setLast] = useState<any>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function scan(raw: string) {
    const value = raw.trim(); if (!value) return;
    setError(''); setBusy(true);
    try { const result = await runCommand('scanTicket', { eventId, ...asInput(value), gate: gate.trim() || 'Main' }); setLast({ ...result, at: new Date() }); setCode(''); navigator.vibrate?.(result.result === 'admitted' || result.result === 'reentry' ? 80 : [60, 60, 60]); router.refresh(); }
    catch (e: any) { setLast(null); setError(e.message === 'Ticket not found' ? 'No ticket has that code.' : e.message); navigator.vibrate?.([60, 60, 60]); }
    finally { setBusy(false); }
  }
  const shown = last ? RESULT[last.result] || { title: last.result, tone: 'border-border' } : null;
  return (
    <div className="space-y-4">
      {shown ? <div role="status" aria-live="assertive" className={cn('rounded-lg border-2 p-4', shown.tone)}><p className="text-2xl font-semibold">{shown.title}</p><p className="text-sm opacity-80">{last.admitted} admitted so far</p></div> : null}
      {error ? <p role="alert" className="rounded-lg border-2 border-red-600 bg-red-50 p-4 text-base font-medium text-red-900 dark:bg-red-950 dark:text-red-100">{error}</p> : null}
      <CameraScan onCode={scan} busy={busy} />
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); scan(code); }}>
        <label className="flex-1 space-y-1 text-sm font-medium">Ticket code<Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TK-…" autoCapitalize="characters" autoComplete="off" className="h-11 text-base" /></label>
        <label className="space-y-1 text-sm font-medium sm:w-32">Gate<Input value={gate} onChange={(e) => setGate(e.target.value)} className="h-11 text-base" /></label>
        <Button type="submit" className="h-11" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'Check ticket'}</Button>
      </form>
    </div>
  );
}
