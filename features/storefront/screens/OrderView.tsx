'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, usd, showTime } from '../lib/api';

export function OrderView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [transfer, setTransfer] = useState<{ code: string; email: string; name: string } | null>(null);
  const [result, setResult] = useState<any>(null);
  useEffect(() => { const raw = sessionStorage.getItem(`order:${orderId}`); if (raw) setOrder(JSON.parse(raw)); else setError('Open this order from the lookup page with your email and order number.'); }, [orderId]);
  async function send() {
    setError('');
    try {
      const d = await api('mutation($i: TransferTicketInput!) { transferTicket(input: $i) }', { i: { ticketCode: transfer!.code, orderId, proof: order.proof, toEmail: transfer!.email, toName: transfer!.name, idempotencyKey: crypto.randomUUID() } });
      setResult(d.transferTicket); setTransfer(null);
    } catch (e: any) { setError(e.message); }
  }
  if (!order) return <main className="mx-auto max-w-3xl space-y-3 p-4">{error ? <p className="text-sm">{error}</p> : <p className="text-sm">Loading…</p>}<Link className="inline-flex min-h-11 items-center text-sm underline" href="/lookup">Find my order</Link></main>;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Order confirmed</h1>
      <p className="font-mono text-lg" data-testid="order-code">{order.orderNumber}</p>
      <p className="font-mono text-xs uppercase tracking-wide opacity-70">{String(order.status).replace(/_/g, ' ')}</p>
      <p className="text-sm">Keep your order number and email to look this order up later. Show the ticket code at the door.</p>
      <ul className="divide-y rounded-lg border">{(order.tickets || []).map((t: any) => (
        <li key={t.ticketCode} className="space-y-1 p-3"><div className="font-mono text-sm">{t.ticketCode}{t.seat ? ` · ${t.seat}` : ''}</div>
          <button className="inline-flex min-h-11 items-center text-sm underline" onClick={() => setTransfer({ code: t.ticketCode, email: '', name: '' })}>Transfer</button></li>))}</ul>
      {transfer ? <div className="space-y-2 rounded-lg border p-3"><p className="text-sm">Transfer {transfer.code}</p>
        <input placeholder="Recipient name" value={transfer.name} onChange={(e) => setTransfer({ ...transfer, name: e.target.value })} className="min-h-11 w-full rounded border px-3 py-2 text-sm" />
        <input placeholder="Recipient email" value={transfer.email} onChange={(e) => setTransfer({ ...transfer, email: e.target.value })} className="min-h-11 w-full rounded border px-3 py-2 text-sm" />
        <button onClick={send} className="min-h-11 rounded bg-black px-3 py-2 text-sm text-white">Send ticket</button></div> : null}
      {result ? <p className="break-all text-sm">Sent. The new ticket is {result.ticketCode}; your old code no longer admits.</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Link className="inline-flex min-h-11 items-center text-sm underline" href="/">Back to events</Link>
    </main>
  );
}
