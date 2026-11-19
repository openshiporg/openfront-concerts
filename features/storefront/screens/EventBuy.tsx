'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { usd } from '../lib/format';
import { btn, input, label, row } from '../lib/ui';

declare global { interface Window { Stripe?: any } }
const loadStripeJs = () => new Promise<void>((resolve, reject) => {
  if (window.Stripe) return resolve();
  const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = () => resolve(); s.onerror = () => reject(new Error('The card form did not load. Check your connection and try again.')); document.head.appendChild(s);
});
const key = () => crypto.randomUUID();
const CLOSED: Record<string, string> = { announced: 'Tickets are not on sale yet.', sold_out: 'This show is sold out.', postponed: 'This show is postponed, so tickets are not on sale.' };

export function EventBuy({ eventId, status }: { eventId: string; status: string }) {
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
  const [cardReady, setCardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const stripeRef = useRef<any>(null); const elementsRef = useRef<any>(null);

  const load = () => api('query($id: ID!) { eventAvailability(eventId: $id) }', { id: eventId }).then((d) => setData(d.eventAvailability)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hold) return; const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000))), 1000); return () => clearInterval(t); }, [hold]);

  // Seed the countdown with the hold so the first paint never reads as expired.
  const takeHold = (h: any) => { setLeft(Math.max(0, Math.floor((new Date(h.expiresAt).getTime() - Date.now()) / 1000))); setHold(h); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };

  const holdGa = (levelId: string) => run(async () => {
    const d = await api('mutation($e: ID!, $l: ID!, $q: Int!, $c: String, $k: String!) { createGaHold(eventId: $e, levelId: $l, qty: $q, presaleCode: $c, idempotencyKey: $k) }', { e: eventId, l: levelId, q: qty[levelId] || 1, c: code || null, k: key() });
    takeHold(d.createGaHold);
  });
  const holdSeats = () => run(async () => {
    const d = await api('mutation($e: ID!, $s: [ID!]!, $c: String, $k: String!) { createSeatHold(eventId: $e, seatInventoryIds: $s, presaleCode: $c, idempotencyKey: $k) }', { e: eventId, s: picked, c: code || null, k: key() });
    takeHold(d.createSeatHold); await load();
  });
  const startOver = () => { setHold(null); setPay(null); setCardReady(false); setPicked([]); setError(''); load(); };
  const startPayment = () => run(async () => {
    const d = await api('mutation($i: StartTicketCheckoutInput!) { startTicketCheckout(input: $i) }', { i: { holdId: hold.id, proof: hold.proof, email: form.email, name: form.name, ageAttested: form.age, idempotencyKey: key() } });
    const s = d.startTicketCheckout; setPay(s);
    if (s.expiresAt) takeHold({ ...hold, expiresAt: s.expiresAt });
    await loadStripeJs();
    stripeRef.current = window.Stripe(s.publishableKey);
    elementsRef.current = stripeRef.current.elements({ clientSecret: s.clientSecret });
    setTimeout(() => { const el = elementsRef.current.create('payment'); el.on('ready', () => setCardReady(true)); el.mount('#payment-element'); }, 0);
  });
  const confirm = () => run(async () => {
    const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: 'if_required' });
    if (result.error) throw new Error(result.error.message);
    const d = await api('mutation($i: CompleteTicketCheckoutInput!) { completeTicketCheckout(input: $i) }', { i: { orderId: pay.orderId, proof: pay.proof } });
    const done = d.completeTicketCheckout;
    sessionStorage.setItem(`order:${done.orderId}`, JSON.stringify({ ...done, proof: pay.proof }));
    router.push(`/orders/${done.orderId}`);
  });

  const wrap = 'mt-10 border-t border-black/10 pt-8';
  if (!data) return <section className={wrap}>{error ? <p role="alert" className="text-red-700">{error}</p> : <p className="text-black/60">Loading tickets…</p>}</section>;
  const { event, levels, seats } = data;
  const live = event.status || status;
  const seatById = new Map<string, any>(seats.map((s: any) => [s.id, s]));
  const pickedSeats = picked.map((id) => seatById.get(id)).filter(Boolean);
  const pickedLevel = pickedSeats[0] ? levels.find((l: any) => l.id === pickedSeats[0].priceLevelId) : null;
  const phaseOf = (l: any) => [...(l.priceLevelPhase_priceLevel || [])].filter((p: any) => new Date(p.startsAt) <= new Date()).sort((a: any, b: any) => a.sort - b.sort).find((p: any) => p.sold < p.quantity);
  const priceOf = (l: any) => phaseOf(l)?.priceCents ?? l.priceCents;
  const reservedLevels = levels.filter((l: any) => l.sections.some((s: any) => s.kind === 'reserved')).sort((a: any, b: any) => b.priceCents - a.priceCents);
  const gaLevels = levels.filter((l: any) => l.sections.every((s: any) => s.kind === 'ga'));
  const timer = <p className="text-sm" aria-live="polite">{left > 0 ? <>Held for you for <span className="font-semibold">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></> : <span className="font-semibold text-red-700">Your hold ran out.</span>}</p>;
  const again = <button type="button" onClick={startOver} className="min-h-11 text-sm underline underline-offset-4">Choose tickets again</button>;

  if (CLOSED[live]) return <section className={wrap}><h2 className="text-2xl font-semibold tracking-tight">Tickets</h2><p className="mt-3">{CLOSED[live]}</p>
    {levels.length ? <ul className="mt-4 max-w-md divide-y divide-black/10 border-y border-black/10">{levels.map((l: any) => <li key={l.id} className={row}><span>{l.name}</span><span>{usd(priceOf(l), l.currencyCode)}</span></li>)}</ul> : null}</section>;

  return (
    <section className={wrap}>
      {error ? <p role="alert" className="mb-6 border-l-2 border-red-700 pl-3 text-red-700">{error}</p> : null}

      {!hold ? <>
        <h2 className="text-2xl font-semibold tracking-tight">Tickets</h2>
        <div className="mt-4 max-w-xs">
          <label htmlFor="code" className={label}>{live === 'presale' ? 'Presale code' : <>Promo code <span className="font-normal text-black/50">(optional)</span></>}</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" className={input} />
          {live === 'presale' ? <p className="mt-1.5 text-sm text-black/60">This show is in presale. You need the code to buy.</p> : null}
        </div>

        {gaLevels.length ? <ul className="mt-6 max-w-2xl divide-y divide-black/10 border-y border-black/10">
          {gaLevels.map((l: any) => { const phase = phaseOf(l); const open = l.capacity - l.sold - l.held - l.productionHeld; const max = Math.max(1, Math.min(l.perOrderLimit || 8, open)); return (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
              <div><p className="font-semibold">{l.name}</p>
                <p className="text-sm text-black/70">{usd(priceOf(l), l.currencyCode)} each + {usd(l.feeCents + l.facilityFeeCents, l.currencyCode)} fees{phase ? ` · ${phase.name} price` : ''}</p>
                {open < 1 ? <p className="text-sm font-semibold">Sold out</p> : open <= 20 ? <p className="text-sm font-semibold">{open} left</p> : null}</div>
              <div className="flex items-end gap-3">
                <div><label className="mb-1 block text-xs text-black/60" htmlFor={`q-${l.id}`}>Quantity</label>
                  <select id={`q-${l.id}`} disabled={open < 1} value={qty[l.id] || 1} onChange={(e) => setQty({ ...qty, [l.id]: Number(e.target.value) })} className={`${input} w-20`}>{Array.from({ length: max }, (_, n) => <option key={n + 1}>{n + 1}</option>)}</select></div>
                <button type="button" disabled={busy || open < 1} onClick={() => holdGa(l.id)} className={btn}>{busy ? 'Holding…' : 'Continue'}</button></div>
            </li>); })}
        </ul> : null}

        {reservedLevels.length ? <div className="mt-8">
          <h3 className="text-lg font-semibold">{gaLevels.length ? 'Or choose seats' : 'Choose your seats'}</h3>
          <p className="mt-1 text-sm text-black/70">Up to 8 seats in one section.</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-hidden>
            <li className="flex items-center gap-2"><span className="size-4 rounded-sm border border-black/40 bg-white" />Available</li>
            <li className="flex items-center gap-2"><span className="size-4 rounded-sm bg-[#141414]" />Your seats</li>
            <li className="flex items-center gap-2"><span className="size-4 rounded-sm bg-black/15" />Taken</li>
          </ul>
          {reservedLevels.map((l: any) => { const rows = new Map<string, any[]>(); for (const s of seats.filter((x: any) => x.priceLevelId === l.id).sort((a: any, b: any) => a.seat.y - b.seat.y || a.seat.x - b.seat.x)) rows.set(s.seat.row, [...(rows.get(s.seat.row) || []), s]); const openSeats = seats.filter((x: any) => x.priceLevelId === l.id && x.status === 'open').length; return (
            <div key={l.id} className="mt-6">
              <p><span className="font-semibold">{l.name}</span> · {usd(priceOf(l), l.currencyCode)} each + {usd(l.feeCents + l.facilityFeeCents, l.currencyCode)} fees{phaseOf(l) ? ` · ${phaseOf(l).name} price` : ''}<span className="text-black/60"> · {openSeats} open</span></p>
              <div className="mt-2 max-w-full overflow-x-auto pb-2" tabIndex={0} role="group" aria-label={`${l.name} seats`}>
                <div className="w-max">
                  {[...rows.entries()].map(([name, list]) => <div key={name} className="flex items-center"><span className="w-7 shrink-0 text-xs text-black/60">{name}</span>
                    {list.map((s) => { const on = picked.includes(s.id); const free = s.status === 'open'; return <button key={s.id} type="button" disabled={!free && !on} aria-pressed={on} aria-label={`${s.seat.label}${s.seat.accessible ? ', accessible' : ''}${s.seat.obstructed ? ', limited view' : ''}, ${on ? 'selected' : free ? 'available' : 'taken'}`} title={`${s.seat.label}${s.seat.accessible ? ' · accessible' : ''}${s.seat.obstructed ? ' · limited view' : ''}`}
                      onClick={() => { setError(''); if (on) return setPicked(picked.filter((x) => x !== s.id)); if (pickedLevel && pickedLevel.id !== l.id) return setPicked([s.id]); if (picked.length < 8) setPicked([...picked, s.id]); }}
                      className="group flex size-11 shrink-0 items-center justify-center disabled:cursor-not-allowed md:size-7"><span className={`size-6 rounded-sm md:size-5 ${on ? 'bg-[#141414]' : free ? 'border border-black/40 bg-white group-hover:border-2 group-hover:border-black' : 'bg-black/15'}`} /></button>; })}</div>)}
                </div>
              </div>
            </div>); })}
          <div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-[#f2f2f2] px-5 py-3 md:-mx-8 md:px-8">
            <p className="text-sm">{pickedSeats.length ? <><span className="font-semibold">{pickedSeats.map((s) => s.seat.label).join(', ')}</span>{pickedLevel ? ` · ${usd(priceOf(pickedLevel) * pickedSeats.length, pickedLevel.currencyCode)} before fees` : ''}</> : 'No seats chosen yet.'}</p>
            <button type="button" disabled={busy || !picked.length} onClick={holdSeats} className={btn}>{busy ? 'Holding…' : picked.length ? `Continue with ${picked.length} ${picked.length === 1 ? 'seat' : 'seats'}` : 'Continue'}</button>
          </div>
        </div> : null}
        {!gaLevels.length && !reservedLevels.length ? <p className="mt-4">No tickets are available for this show.</p> : null}
      </> : null}

      {hold ? <div className="grid gap-10 md:grid-cols-[1fr_20rem]">
        <div className="max-w-xl">
          {!pay ? <>
            <h2 className="text-2xl font-semibold tracking-tight">Your details</h2>
            <p className="mt-1 text-sm text-black/70">Tickets are emailed to this address. You need it to find the order later.</p>
            <div className="mt-5 space-y-4">
              <div><label htmlFor="b-name" className={label}>Full name</label><input id="b-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></div>
              <div><label htmlFor="b-email" className={label}>Email</label><input id="b-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} /></div>
              {event.ageRestriction !== 'all_ages' ? <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[#141414]" checked={form.age} onChange={(e) => setForm({ ...form, age: e.target.checked })} />Everyone in my party is {event.ageRestriction} or older. ID is checked at the door.</label> : null}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><button type="button" disabled={busy || left < 1 || !form.name.trim() || !form.email.trim() || (event.ageRestriction !== 'all_ages' && !form.age)} onClick={startPayment} className={btn}>{busy ? 'One moment…' : 'Continue to payment'}</button>{again}</div>
            </div>
          </> : <>
            <h2 className="text-2xl font-semibold tracking-tight">Pay by card</h2>
            <p className="mt-1 text-sm text-black/70">Order {pay.orderNumber} · {form.email}</p>
            {!cardReady ? <p className="mt-5 text-sm text-black/60">Loading the card form…</p> : null}
            <div id="payment-element" className="mt-5" />
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"><button type="button" disabled={busy || left < 1 || !cardReady} onClick={confirm} className={btn}>{busy ? 'Paying…' : `Pay ${usd(pay.totalCents ?? hold.quote.totalCents, hold.quote.currencyCode)}`}</button>{left < 1 ? again : null}</div>
          </>}
        </div>
        <aside className="md:order-last">
          <h2 className="text-lg font-semibold">Your tickets</h2>
          <p className="mt-1 text-sm">{hold.quote.seats?.length ? `${hold.quote.levelName}: ${hold.quote.seats.map((s: any) => s.label).join(', ')}` : `${hold.quantity} × ${hold.quote.levelName}`}{hold.quote.phaseName ? ` · ${hold.quote.phaseName} price` : ''}</p>
          <dl className="mt-3 divide-y divide-black/10 border-y border-black/10 text-sm">
            <div className={row}><dt>Tickets</dt><dd>{usd(hold.quote.subtotalCents, hold.quote.currencyCode)}</dd></div>
            {hold.quote.discountCents ? <div className={row}><dt>Discount</dt><dd>-{usd(hold.quote.discountCents, hold.quote.currencyCode)}</dd></div> : null}
            <div className={row}><dt>Service fees</dt><dd>{usd(hold.quote.serviceFeesCents, hold.quote.currencyCode)}</dd></div>
            <div className={row}><dt>Facility fees</dt><dd>{usd(hold.quote.facilityFeesCents, hold.quote.currencyCode)}</dd></div>
            <div className={row}><dt>Tax</dt><dd>{usd(hold.quote.taxCents, hold.quote.currencyCode)}</dd></div>
            <div className={`${row} text-base font-semibold`}><dt>Total</dt><dd>{usd(hold.quote.totalCents, hold.quote.currencyCode)}</dd></div>
          </dl>
          <div className="mt-3">{timer}</div>
        </aside>
      </div> : null}
    </section>
  );
}
