'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TicketQr } from '../components/TicketQr';
import { api } from '../lib/api';
import { usd, day, clock, words } from '../lib/format';
import { btn, btnQuiet, input, label, link, row } from '../lib/ui';

const HEADING: Record<string, string> = { paid: 'You have tickets', partially_refunded: 'You have tickets', refunded: 'Order refunded', cancelled: 'Order cancelled' };

export function OrderView({ orderId, signedLink }: { orderId: string; signedLink?: string }) {
  const [order, setOrder] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [transfer, setTransfer] = useState<{ code: string; email: string; name: string } | null>(null);
  const [sent, setSent] = useState<{ from: string; to: string; code: string; emailed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  // The order opens with its signed link (email, checkout, lookup) on any device, or for its signed-in buyer.
  useEffect(() => {
    let live = true;
    api('query($id: ID!, $t: String) { ticketOrderView(orderId: $id, proof: $t) }', { id: orderId, t: signedLink || null })
      .then((d) => { if (live) setOrder(d.ticketOrderView); })
      .catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [orderId, signedLink]);
  async function send(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const d = await api('mutation($i: TransferTicketInput!) { transferTicket(input: $i) }', { i: { ticketCode: transfer!.code, orderId, proof: order.proof, toEmail: transfer!.email, toName: transfer!.name, idempotencyKey: crypto.randomUUID() } });
      const fresh = await api('query($id: ID!, $t: String) { ticketOrderView(orderId: $id, proof: $t) }', { id: orderId, t: order.proof });
      setOrder(fresh.ticketOrderView);
      setSent({ from: transfer!.code, to: transfer!.name || transfer!.email, code: d.transferTicket.ticketCode, emailed: Boolean(d.transferTicket.emailed) }); setTransfer(null);
    } catch (err: any) { setError(/proof|expired/i.test(err.message) ? 'For your security this page timed out. Find the order again to send a ticket.' : err.message); } finally { setBusy(false); }
  }
  if (!order) return <main>{missing ? <><h1 className="text-3xl font-semibold tracking-tight">Open this order</h1><p className="mt-2 max-w-md text-black/70">Use the link in your confirmation email, find the order with its number and your email, or sign in to the account you bought with.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={btn} href="/lookup">Find my order</Link><Link className={btnQuiet} href={`/account/sign-in?next=${encodeURIComponent(`/orders/${orderId}`)}`}>Sign in</Link></div></> : <p className="text-black/60">Loading your order…</p>}</main>;
  const ev = order.event; const tz = ev?.venue?.timezone; const cur = order.currencyCode;
  const tickets = order.tickets || [];
  const money: [string, number | undefined, boolean?][] = [['Tickets', order.subtotalCents], ['Discount', order.discountCents ? -order.discountCents : 0, true], ['Service fees', order.serviceFeesCents], ['Facility fees', order.facilityFeesCents], ['Tax', order.taxCents, true]];
  return (
    <main className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{HEADING[order.status] || 'Your order'}</h1>
      <p className="mt-2 text-black/70">Order <span className="font-semibold text-black" data-testid="order-code">{order.orderNumber}</span>{order.status && !['paid'].includes(order.status) ? ` · ${words(order.status)}` : ''}</p>
      {order.status === 'cancelled' && !tickets.length ? <p className="mt-4">Your hold ran out before the payment finished, so no tickets were issued. The payment is refunded to your card.</p> : null}
      {ev ? <p className="mt-5 text-lg"><span className="font-semibold">{ev.title}</span><br /><span className="text-base text-black/70">{day(ev.showAt, tz)} · show {clock(ev.showAt, tz)}{ev.doorsAt ? ` · doors ${clock(ev.doorsAt, tz)}` : ''}{ev.venue?.name ? ` · ${ev.venue.name}${ev.venue.city ? `, ${ev.venue.city}` : ''}` : ''}</span></p> : null}

      {tickets.length ? <>
        <h2 className="mt-8 text-xl font-semibold tracking-tight">{tickets.length === 1 ? 'Ticket' : `${tickets.length} tickets`}</h2>
        <p className="mt-1 text-sm text-black/70">Show the QR code at the door. Each one lets one person in, once. The same tickets are in your confirmation email.</p>
        <ul className="mt-3 divide-y divide-black/10 border-y border-black/10">{tickets.map((t: any, i: number) => (
          <li key={t.ticketCode} className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4">
            {t.scan ? <TicketQr value={t.scan} label={`QR code for ticket ${t.ticketCode}`} /> : null}
            <div className="min-w-0 flex-1 space-y-2">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-black/60">Ticket {i + 1} of {tickets.length}</p>
                <p className="break-all font-mono font-semibold tracking-wide">{t.ticketCode}</p>
                <p className="text-sm text-black/70">{[t.seat || 'General admission', t.holderName, t.status && t.status !== 'valid' ? words(t.status) : ''].filter(Boolean).join(' · ')}</p></div>
              {order.proof && (!t.status || t.status === 'valid') ? <button type="button" className={btnQuiet} onClick={() => { setSent(null); setError(''); setTransfer({ code: t.ticketCode, email: '', name: '' }); }}>Send to someone</button> : null}
            </div>
          </li>))}</ul>
      </> : null}

      {sent ? <p role="status" className="mt-4 border-l-2 border-black pl-3"><span className="font-semibold">Ticket sent to {sent.to}.</span> {sent.emailed ? 'They have it by email.' : 'The email did not go out, so give them the new code yourself:'} Their code is {sent.code}. The old code no longer gets anyone in.</p> : null}
      {transfer ? <form onSubmit={send} className="mt-6 max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">Send ticket {transfer.code}</h2>
        <p className="text-sm text-black/70">They get a new ticket code by email. Yours stops working.</p>
        <div><label htmlFor="t-name" className={label}>Their name</label><input id="t-name" required value={transfer.name} onChange={(e) => setTransfer({ ...transfer, name: e.target.value })} className={input} /></div>
        <div><label htmlFor="t-email" className={label}>Their email</label><input id="t-email" type="email" required value={transfer.email} onChange={(e) => setTransfer({ ...transfer, email: e.target.value })} className={input} /></div>
        <div className="flex gap-3"><button disabled={busy} className={btn}>{busy ? 'Sending…' : 'Send ticket'}</button><button type="button" className={btnQuiet} onClick={() => setTransfer(null)}>Cancel</button></div>
      </form> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}

      {order.totalCents != null ? <dl className="mt-8 divide-y divide-black/10 border-y border-black/10 text-sm">
        {money.filter(([, v, optional]) => v != null && !(optional && !v)).map(([k, v]) => <div key={k} className={row}><dt>{k}</dt><dd>{usd(v as number, cur)}</dd></div>)}
        <div className={`${row} text-base font-semibold`}><dt>Total paid</dt><dd>{usd(order.totalCents, cur)}</dd></div>
        {order.refundedCents ? <div className={row}><dt>Refunded</dt><dd>{usd(order.refundedCents, cur)}</dd></div> : null}
      </dl> : null}
      <p className="mt-8"><Link className={link} href="/">See all shows</Link></p>
    </main>
  );
}
