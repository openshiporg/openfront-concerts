'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, usd, showTime } from '../lib/api';

export function LookupPage() {
  const [email, setEmail] = useState(''); const [number, setNumber] = useState('');
  const [order, setOrder] = useState<any>(null); const [error, setError] = useState('');
  async function find(e: React.FormEvent) {
    e.preventDefault(); setError(''); setOrder(null);
    try { const d = await api('query($e: String!, $n: String!) { lookupTicketOrder(email: $e, orderNumber: $n) }', { e: email, n: number }); setOrder(d.lookupTicketOrder); }
    catch (err: any) { setError(err.message); }
  }
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Find my order</h1>
      <form onSubmit={find} className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded border px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm">Order number<input required value={number} onChange={(e) => setNumber(e.target.value)} className="rounded border px-3 py-2" /></label>
        <button className="self-end rounded bg-black px-3 py-2 text-sm text-white">Find</button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {order ? <section className="space-y-2 rounded-lg border p-4">
        <p className="font-mono">{order.orderNumber}</p><p className="font-mono text-xs uppercase tracking-wide opacity-70">{String(order.status).replace(/_/g, ' ')}</p>
        <p className="text-sm">{order.event?.title} · {showTime(order.event?.showAt)}</p><p className="text-sm">Total {usd(order.totalCents, order.currencyCode)}{order.refundedCents ? ` · refunded ${usd(order.refundedCents, order.currencyCode)}` : ''}</p>
        <ul className="text-sm">{order.tickets.map((t: any) => <li key={t.ticketCode} className="font-mono">{t.ticketCode} · {String(t.status).replace(/_/g, ' ')}</li>)}</ul>
      </section> : null}
      <Link className="text-sm underline" href="/">Back to events</Link>
    </main>
  );
}
