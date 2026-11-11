'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, usd, showTime } from '../lib/api';

declare global { interface Window { Stripe?: any } }
const loadStripeJs = () => new Promise<void>((resolve, reject) => {
  if (window.Stripe) return resolve();
  const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = () => resolve(); s.onerror = () => reject(new Error('Payment form failed to load')); document.head.appendChild(s);
});
const key = () => crypto.randomUUID();

export function EventBuy({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [hold, setHold] = useState<any>(null);
  const [left, setLeft] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', age: false });
  const [pay, setPay] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const stripeRef = useRef<any>(null); const elementsRef = useRef<any>(null);

  const load = () => api('query($id: ID!) { eventAvailability(eventId: $id) }', { id: eventId }).then((d) => setData(d.eventAvailability)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [eventId]);
  useEffect(() => { if (!hold) return; const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000))), 1000); return () => clearInterval(t); }, [hold]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };

  const holdGa = (levelId: string) => run(async () => {
    const d = await api('mutation($e: ID!, $l: ID!, $q: Int!, $c: String, $k: String!) { createGaHold(eventId: $e, levelId: $l, qty: $q, presaleCode: $c, idempotencyKey: $k) }', { e: eventId, l: levelId, q: qty[levelId] || 1, c: code || null, k: key() });
    setHold(d.createGaHold);
  });
  const holdSeats = () => run(async () => {
    const d = await api('mutation($e: ID!, $s: [ID!]!, $c: String, $k: String!) { createSeatHold(eventId: $e, seatInventoryIds: $s, presaleCode: $c, idempotencyKey: $k) }', { e: eventId, s: picked, c: code || null, k: key() });
    setHold(d.createSeatHold); await load();
  });
  const startPayment = () => run(async () => {
    const d = await api('mutation($i: StartTicketCheckoutInput!) { startTicketCheckout(input: $i) }', { i: { holdId: hold.id, proof: hold.proof, email: form.email, name: form.name, ageAttested: form.age, idempotencyKey: key() } });
    const s = d.startTicketCheckout; setPay(s);
    await loadStripeJs();
    stripeRef.current = window.Stripe(s.publishableKey);
    elementsRef.current = stripeRef.current.elements({ clientSecret: s.clientSecret });
    setTimeout(() => elementsRef.current.create('payment').mount('#payment-element'), 0);
  });
  const confirm = () => run(async () => {
    const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: 'if_required' });
    if (result.error) throw new Error(result.error.message);
    const d = await api('mutation($i: CompleteTicketCheckoutInput!) { completeTicketCheckout(input: $i) }', { i: { orderId: pay.orderId, proof: pay.proof } });
    const done = d.completeTicketCheckout;
    sessionStorage.setItem(`order:${done.orderId}`, JSON.stringify({ ...done, proof: pay.proof }));
    router.push(`/orders/${done.orderId}`);
  });

  if (!data) return <main className="mx-auto max-w-3xl p-4">{error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm">Loading…</p>}</main>;
  const { event, levels, seats } = data;
  const seatById = new Map<string, any>(seats.map((s: any) => [s.id, s]));
  const pickedSeats = picked.map((id) => seatById.get(id)).filter(Boolean);
  const levelFor = (id: string) => levels.find((l: any) => l.id === id);
  const reservedLevels = levels.filter((l: any) => l.sections.some((s: any) => s.kind === 'reserved'));
  const gaLevels = levels.filter((l: any) => l.sections.every((s: any) => s.kind === 'ga'));
  const tz = event.venue?.timezone || undefined;
  const m = Math.floor(left / 60), sec = String(left % 60).padStart(2, '0');

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4">
      <header className="space-y-1"><h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm opacity-70">{event.venue?.name}, {event.venue?.city} · {showTime(event.showAt, tz)} · doors {showTime(event.doorsAt, tz)} · {String(event.ageRestriction).replace(/_/g, ' ')}</p>
        {event.description ? <p className="text-sm">{event.description}</p> : null}</header>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {!hold ? <>
        <label className="flex flex-col gap-1 text-sm">Presale or promo code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="min-h-11 max-w-xs rounded border px-3 py-2" /></label>
        {gaLevels.length ? <section className="space-y-2"><h2 className="font-medium">Tickets</h2>
          {gaLevels.map((l: any) => { const phase = l.priceLevelPhase_priceLevel?.filter((p: any) => new Date(p.startsAt) <= new Date()).sort((a: any, b: any) => a.sort - b.sort).find((p: any) => p.sold < p.quantity); const left = l.capacity - l.sold - l.held - l.productionHeld; return (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div><div className="font-medium">{l.name}</div><div className="text-sm opacity-70">{usd(phase?.priceCents ?? l.priceCents)} + {usd(l.feeCents)} fee{phase ? ` · ${phase.name}` : ''} · {left > 0 ? `${left} left` : 'Sold out'}</div></div>
              <div className="flex items-center gap-2"><label className="text-sm" htmlFor={`q-${l.id}`}>Qty</label>
                <input id={`q-${l.id}`} type="number" min={1} max={l.perOrderLimit} value={qty[l.id] || 1} onChange={(e) => setQty({ ...qty, [l.id]: Number(e.target.value) })} className="min-h-11 w-16 rounded border px-2 py-1" />
                <button disabled={busy || left < 1} onClick={() => holdGa(l.id)} className="min-h-11 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-40">Hold</button></div>
            </div>); })}
        </section> : null}
        {reservedLevels.length ? <section className="space-y-3"><h2 className="font-medium">Choose seats</h2>
          {reservedLevels.map((l: any) => { const rows = new Map<string, any[]>(); for (const s of seats.filter((x: any) => x.priceLevelId === l.id).sort((a: any, b: any) => a.seat.y - b.seat.y || a.seat.x - b.seat.x)) { const k = s.seat.row; rows.set(k, [...(rows.get(k) || []), s]); } return (
            <div key={l.id} className="space-y-1"><div className="text-sm font-medium">{l.name} · {usd(l.priceCents)} + {usd(l.feeCents)} fee</div>
              <div className="max-w-full overflow-x-auto rounded-lg border p-2"><div className="w-max space-y-0.5"><div className="mb-2 rounded bg-black/80 px-3 py-1 text-center font-mono text-xs uppercase tracking-wide text-white">Stage</div>{[...rows.entries()].map(([row, list]) => <div key={row} className="flex items-center gap-0.5"><span className="w-6 shrink-0 text-xs">{row}</span>
                {list.map((s) => { const on = picked.includes(s.id); const free = s.status === 'open'; return <button key={s.id} type="button" disabled={!free && !on} aria-label={`${s.seat.label} ${s.status}`} title={s.seat.label}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== s.id) : picked.length < 8 ? [...picked, s.id] : picked)}
                  className={`size-3.5 shrink-0 rounded-sm border ${on ? 'bg-black' : free ? 'bg-emerald-200' : 'bg-zinc-300 opacity-50'}`} />; })}</div>)}</div></div></div>); })}
          <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{pickedSeats.length ? pickedSeats.map((s) => s.seat.label).join(', ') : 'No seats selected'}</span>
            <button disabled={busy || !picked.length} onClick={holdSeats} className="min-h-11 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-40">Hold seats</button></div>
        </section> : null}
      </> : null}

      {hold && !pay ? <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Your hold</h2>
        <p className="text-sm">{hold.quote.levelName}{hold.quote.seats?.length ? `: ${hold.quote.seats.map((s: any) => s.label).join(', ')}` : ''} × {hold.quote.seats?.length || qty[hold.quote.levelId] || ''}</p>
        <dl className="grid grid-cols-2 gap-1 text-sm"><dt>Tickets</dt><dd className="text-right">{usd(hold.quote.subtotalCents)}</dd><dt>Service fees</dt><dd className="text-right">{usd(hold.quote.serviceFeesCents)}</dd><dt>Facility fees</dt><dd className="text-right">{usd(hold.quote.facilityFeesCents)}</dd>
          {hold.quote.discountCents ? <><dt>Discount</dt><dd className="text-right">-{usd(hold.quote.discountCents)}</dd></> : null}<dt>Tax</dt><dd className="text-right">{usd(hold.quote.taxCents)}</dd><dt className="font-medium">Total</dt><dd className="text-right font-medium">{usd(hold.quote.totalCents)}</dd></dl>
        <p className="font-mono text-sm" aria-live="polite">{left > 0 ? `Held for ${m}:${sec}` : 'Hold expired'}</p>
        <div className="grid gap-2 sm:grid-cols-2"><label className="flex flex-col gap-1 text-sm">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="min-h-11 rounded border px-3 py-2" /></label>
          <label className="flex flex-col gap-1 text-sm">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="min-h-11 rounded border px-3 py-2" /></label></div>
        {event.ageRestriction !== 'all_ages' ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.age} onChange={(e) => setForm({ ...form, age: e.target.checked })} />I confirm I meet the {event.ageRestriction}+ age requirement</label> : null}
        <button disabled={busy || left < 1 || !form.name || !form.email} onClick={startPayment} className="min-h-11 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40">Continue to payment</button>
      </section> : null}

      {pay ? <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Payment · {usd(pay.totalCents)}</h2><p className="font-mono text-sm">Order {pay.orderNumber}</p>
        <div id="payment-element" />
        <button disabled={busy} onClick={confirm} className="min-h-11 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40">{busy ? 'Processing…' : `Pay ${usd(pay.totalCents)}`}</button></section> : null}
    </main>
  );
}
