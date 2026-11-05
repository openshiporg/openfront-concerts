'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runTyped } from '../../lib/commands';
import { money } from '../../lib/format';
import { toCents } from '../../components/EditorForm';

const DENOMS: [string, string][] = [['100', '$100'], ['50', '$50'], ['20', '$20'], ['10', '$10'], ['5', '$5'], ['1', '$1'], ['coins', 'Coins (cents)']];
type Drawer = { id: string; label: string; openingFloatCents: number; openedAt: string };
type Closed = { countedCents: number; expectedCents: number; varianceCents: number };

/** The cashier's drawer: open with a float; close with a blind count by denomination. Expected cash is shown only after closing. */
export function CashDrawerPanel({ drawer }: { drawer: Drawer | null }) {
  const router = useRouter();
  const [label, setLabel] = useState('Box office 1');
  const [float, setFloat] = useState('200.00');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [closing, setClosing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Closed | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const run = async (fn: () => Promise<any>) => {
    setPending(true); setError('');
    try { await fn(); setKey(crypto.randomUUID()); router.refresh(); } catch (e: any) { setError(e.message); } finally { setPending(false); }
  };
  if (!drawer) {
    const cents = toCents(float);
    return (
      <section className="space-y-2 rounded-lg border p-4 sm:max-w-md">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">Cash drawer</h2><span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Closed</span></div>
        {result ? <p className="text-sm tabular-nums">Last close: counted {money(result.countedCents)}, expected {money(result.expectedCents)}, {result.varianceCents === 0 ? 'balanced' : `${result.varianceCents > 0 ? 'over' : 'short'} ${money(Math.abs(result.varianceCents))}`}.</p> : <p className="text-sm text-muted-foreground">Door cash sales and cash refunds need your open drawer.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Drawer name" className="h-9 min-w-0" />
          <Input value={float} onChange={(e) => setFloat(e.target.value)} inputMode="decimal" aria-label="Opening float" className="h-9 min-w-0" />
        </div>
        <Button size="sm" disabled={pending || !label.trim() || Number.isNaN(cents)} onClick={() => run(() => runTyped('openCashDrawer', 'OpenCashDrawerInput', { label: label.trim(), openingFloatCents: cents, idempotencyKey: key }))}>{pending ? 'Working…' : 'Open drawer'}</Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>
    );
  }
  const filled = DENOMS.every(([k]) => /^\d+$/.test(counts[k] || ''));
  return (
    <section className="space-y-2 rounded-lg border p-4 sm:max-w-md">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">{drawer.label}</h2><span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500" aria-hidden />Open</span></div>
      <p className="text-sm text-muted-foreground">Float {money(drawer.openingFloatCents)} · opened {new Date(drawer.openedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
      {!closing ? <Button size="sm" variant="outline" onClick={() => setClosing(true)}>Count and close</Button> : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {DENOMS.map(([k, name]) => (
              <label key={k} className="flex min-w-0 flex-col gap-1 text-sm"><span className="text-muted-foreground">{name}</span>
                <Input value={counts[k] || ''} onChange={(e) => setCounts((c) => ({ ...c, [k]: e.target.value }))} inputMode="numeric" aria-label={`Count ${name}`} className="h-9 min-w-0" /></label>
            ))}
          </div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Variance reason (if over or short)" aria-label="Variance reason" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending || !filled} onClick={() => run(async () => {
              const r = await runTyped('closeCashDrawer', 'CloseCashDrawerInput', { drawerId: drawer.id, count: Object.fromEntries(DENOMS.map(([k]) => [k, Number(counts[k])])), reason: reason.trim(), idempotencyKey: key });
              setResult(r); setClosing(false); setCounts({}); setReason('');
            })}>{pending ? 'Working…' : 'Close drawer'}</Button>
            <Button size="sm" variant="outline" onClick={() => setClosing(false)}>Back</Button>
          </div>
        </>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
