'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runTyped } from '../../lib/commands';

const DENOMS: [string, string][] = [['100', '$100'], ['50', '$50'], ['20', '$20'], ['10', '$10'], ['5', '$5'], ['1', '$1'], ['coins', 'Coins (cents)']];

/** A manager counts the cashier's drawer and closes it, with a reason that is kept in the audit trail. */
export function ForceCloseDrawer({ drawerId, label, cashier }: { drawerId: string; label: string; cashier: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  if (!open) return <div className="pt-2"><Button size="sm" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>Count and close for {cashier}</Button></div>;
  const filled = DENOMS.every(([k]) => /^\d+$/.test(counts[k] || ''));
  return (
    <div className="mt-2 space-y-2 rounded-lg border p-3 text-foreground sm:max-w-md">
      <p className="text-sm">Close {label} for {cashier}. Count the cash in the drawer by denomination.</p>
      <div className="grid grid-cols-2 gap-2">
        {DENOMS.map(([k, name]) => (
          <label key={k} className="flex min-w-0 flex-col gap-1 text-sm"><span className="text-muted-foreground">{name}</span>
            <Input value={counts[k] || ''} onChange={(e) => setCounts((c) => ({ ...c, [k]: e.target.value }))} inputMode="numeric" aria-label={`Count ${name}`} className="h-11 min-w-0" /></label>
        ))}
      </div>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why you are closing it (required)" aria-label="Reason" className="h-11" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="min-h-11" disabled={pending || !filled || !reason.trim()} onClick={async () => {
          setPending(true); setError('');
          try {
            await runTyped('forceCloseCashDrawer', 'ForceCloseCashDrawerInput', { drawerId, count: Object.fromEntries(DENOMS.map(([k]) => [k, Number(counts[k])])), reason: reason.trim(), idempotencyKey: key });
            setKey(crypto.randomUUID()); setOpen(false); router.refresh();
          } catch (e: any) { setError(e.message); } finally { setPending(false); }
        }}>{pending ? 'Working…' : 'Close drawer'}</Button>
        <Button size="sm" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Back</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
