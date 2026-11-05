'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runTyped, readQuery } from '../../lib/commands';
import { money } from '../../lib/format';

type Quote = { unitPriceCents: number; phaseName: string; subtotalCents: number; facilityFeesCents: number; serviceFeesCents: number; taxCents: number; totalCents: number };

type Level = { id: string; name: string; priceCents: number; room: number; eventId: string; eventTitle: string; reserved: boolean };
type Seat = { id: string; label: string };

/** Door sales (cash or external card terminal) and comps. Reserved levels pick exact open seats. */
export function DoorSalePanel({ levels }: { levels: Level[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
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
  const [seats, setSeats] = useState<Seat[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [seatFilter, setSeatFilter] = useState('');
  const selected = levels.find((l) => l.id === levelId) || levels[0];
  const count = selected?.reserved ? picked.length : Number(qty);
  useEffect(() => {
    setPicked([]); setSeats([]);
    if (!open || !selected?.reserved) return;
    let live = true;
    readQuery(`query($id: ID!) { seatInventories(where: { priceLevel: { id: { equals: $id } }, status: { equals: "open" } }, take: 2000) { id seat { label } } }`, { id: selected.id })
      .then((d) => { if (live) setSeats(d.seatInventories.map((s: any) => ({ id: s.id, label: s.seat?.label || '' })).sort((a: Seat, b: Seat) => a.label.localeCompare(b.label, undefined, { numeric: true }))); })
      .catch((e) => live && setQuoteError(e.message));
    return () => { live = false; };
  }, [open, selected?.id, selected?.reserved, key]);
  useEffect(() => {
    if (!open || !selected || !Number.isInteger(count) || count < 1) { setQuote(null); return; }
    let live = true;
    const t = setTimeout(() => {
      runTyped('previewDoorSale', 'DoorPreviewInput', { eventId: selected.eventId, levelId: selected.id, qty: count, comp: mode === 'comp' })
        .then((q) => { if (live) { setQuote(q); setQuoteError(''); } })
        .catch((e) => { if (live) { setQuote(null); setQuoteError(e.message); } });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [open, selected?.id, selected?.eventId, count, mode]);
  if (!levels.length) return null;
  if (!open) return <div><button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => setOpen(true)}>Door sale or comp</button></div>;
  const level = levels.find((l) => l.id === levelId) || levels[0];
  const n = count;
  const run = async () => {
    setPending(true); setError(''); setMessage('');
    try {
      const input: Record<string, unknown> = { eventId: level.eventId, levelId: level.id, qty: n, ...(level.reserved ? { seatInventoryIds: picked } : {}), name: name.trim(), email: email.trim(), ageAttested: age, idempotencyKey: key };
      if (mode === 'comp') input.reason = reason.trim();
      else input.tender = tender === 'cash' ? { kind: 'cash', tenderedCents: Math.round(Number(cash) * 100) } : { kind: 'card_external', reference: ref.trim() };
      const r = await runTyped(mode === 'comp' ? 'issueComp' : 'issueDoorSale', 'DoorSaleInput', input);
      setMessage(`${r.orderNumber}: ${r.tickets.length} ticket${r.tickets.length === 1 ? '' : 's'} issued${r.changeCents ? `. Change due ${money(r.changeCents)}` : ''}.`);
      setKey(crypto.randomUUID()); setName(''); setEmail(''); setCash(''); setRef(''); setReason('');
      router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setPending(false); }
  };
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
      {selected?.reserved ? (
        <div className="space-y-2">
          <Input value={seatFilter} onChange={(e) => setSeatFilter(e.target.value)} placeholder="Find seat (e.g. A-1)" aria-label="Find seat" />
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto" role="group" aria-label="Open seats">
            {seats.filter((s) => !seatFilter || s.label.toLowerCase().includes(seatFilter.toLowerCase())).slice(0, 120).map((s) => {
              const on = picked.includes(s.id);
              return <button key={s.id} type="button" aria-pressed={on} onClick={() => setPicked((p) => on ? p.filter((x) => x !== s.id) : [...p, s.id])} className={`rounded-md border px-2 py-1 font-mono text-xs ${on ? 'border-foreground bg-foreground text-background' : ''}`}>{s.label}</button>;
            })}
            {!seats.length ? <p className="text-sm text-muted-foreground">No open seats in this level.</p> : null}
          </div>
          <p className="text-sm text-muted-foreground">{picked.length ? `Seats: ${seats.filter((s) => picked.includes(s.id)).map((s) => s.label).join(', ')}` : 'Pick one seat per ticket.'}</p>
        </div>
      ) : <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" aria-label="Quantity" />}
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" aria-label="Guest name" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Guest email" />
      {mode === 'comp' ? <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Comp reason" /> : (
        <>
          <select className={sel} value={tender} onChange={(e) => setTender(e.target.value as any)} aria-label="Tender"><option value="cash">Cash</option><option value="card">Card terminal</option></select>
          {tender === 'cash' ? <Input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="decimal" placeholder="Cash tendered" aria-label="Cash tendered" /> : <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Terminal reference" aria-label="Terminal reference" />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /> Age restriction checked</label>
        </>
      )}
      {quote ? (
        <p className="text-sm tabular-nums">
          {quote.phaseName ? `${quote.phaseName} · ` : ''}{money(quote.unitPriceCents)} × {n}
          {quote.facilityFeesCents ? ` + facility fee ${money(quote.facilityFeesCents)}` : ''}
          {quote.taxCents ? ` + tax ${money(quote.taxCents)}` : ''}
          {' = '}<span className="font-medium">{money(quote.totalCents)}</span>
        </p>
      ) : quoteError ? <p className="text-sm text-destructive">{quoteError}</p> : null}
      <Button size="sm" disabled={pending || !quote || !name.trim() || !Number.isInteger(n) || n < 1} onClick={run}>{pending ? 'Working…' : mode === 'comp' ? 'Issue comp' : 'Take payment'}</Button>
      {message ? <p className="text-sm">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
