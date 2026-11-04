'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runTyped } from '../../lib/commands';

type Level = { id: string; name: string; priceCents: number; room: number; eventId: string; eventTitle: string };

/** General-admission door sales (cash or external card terminal) and comps. Reserved seating stays online. */
export function DoorSalePanel({ levels }: { levels: Level[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'door' | 'comp'>('door');
  const [levelId, setLevelId] = useState(levels[0]?.id || '');
  const [qty, setQty] = useState('1');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tender, setTender] = useState<'cash' | 'card'>('cash');
  const [cash, setCash] = useState('');
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');
  const [age, setAge] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  if (!levels.length) return null;
  if (!open) return <div><button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => setOpen(true)}>Door sale or comp</button></div>;
  const level = levels.find((l) => l.id === levelId) || levels[0];
  const n = Number(qty);
  const total = mode === 'door' && Number.isInteger(n) ? level.priceCents * n : 0;
  const run = () => start(async () => {
    setError(''); setMessage('');
    try {
      const input: Record<string, unknown> = { eventId: level.eventId, levelId: level.id, qty: n, name: name.trim(), email: email.trim(), ageAttested: age, idempotencyKey: key };
      if (mode === 'comp') input.reason = reason.trim();
      else input.tender = tender === 'cash' ? { kind: 'cash', tenderedCents: Math.round(Number(cash) * 100) } : { kind: 'card_external', reference: ref.trim() };
      const r = await runTyped(mode === 'comp' ? 'issueComp' : 'issueDoorSale', 'DoorSaleInput', input);
      setMessage(`${r.orderNumber}: ${r.tickets.length} ticket${r.tickets.length === 1 ? '' : 's'} issued${r.changeCents ? `. Change due ${(r.changeCents / 100).toFixed(2)}` : ''}.`);
      setKey(crypto.randomUUID()); setName(''); setEmail(''); setCash(''); setRef(''); setReason('');
      router.refresh();
    } catch (e: any) { setError(e.message); }
  });
  const sel = 'h-9 w-full rounded-md border bg-background px-2 text-sm';
  return (
    <section className="space-y-2 rounded-lg border p-4 sm:max-w-md">
      <div className="flex gap-2">
        <Button size="sm" variant={mode === 'door' ? 'default' : 'outline'} onClick={() => setMode('door')}>Door sale</Button>
        <Button size="sm" variant={mode === 'comp' ? 'default' : 'outline'} onClick={() => setMode('comp')}>Comp</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
      </div>
      <select className={sel} value={level.id} onChange={(e) => setLevelId(e.target.value)} aria-label="Event and level">
        {levels.map((l) => <option key={l.id} value={l.id}>{l.eventTitle} · {l.name} · {l.room} left</option>)}
      </select>
      <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" aria-label="Quantity" />
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" aria-label="Guest name" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Guest email" />
      {mode === 'comp' ? <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Comp reason" /> : (
        <>
          <select className={sel} value={tender} onChange={(e) => setTender(e.target.value as any)} aria-label="Tender"><option value="cash">Cash</option><option value="card">Card terminal</option></select>
          {tender === 'cash' ? <Input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="decimal" placeholder="Cash tendered" aria-label="Cash tendered" /> : <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Terminal reference" aria-label="Terminal reference" />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /> Age restriction checked</label>
          <p className="text-sm tabular-nums">Total before fees and tax: ${(total / 100).toFixed(2)}</p>
        </>
      )}
      <Button size="sm" disabled={pending || !name.trim() || !Number.isInteger(n) || n < 1} onClick={run}>{pending ? 'Working…' : mode === 'comp' ? 'Issue comp' : 'Take payment'}</Button>
      {message ? <p className="text-sm">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
