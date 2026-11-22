'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { btn, input, label } from '../lib/ui';

export function LookupPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [number, setNumber] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function find(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const d = await api('query($e: String!, $n: String!) { lookupTicketOrder(email: $e, orderNumber: $n) }', { e: email, n: number });
      const order = d.lookupTicketOrder;
      sessionStorage.setItem(`order:${order.orderId}`, JSON.stringify(order));
      router.push(`/orders/${order.orderId}`);
    } catch (err: any) { setError(err.message === 'Order not found' ? 'No order matches that number and email. Check both and try again.' : err.message); setBusy(false); }
  }
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Find my order</h1>
      <p className="mb-6 mt-2 max-w-md text-black/70">Enter the order number from your confirmation and the email you bought with. You can see your tickets and send one to someone else.</p>
      <form onSubmit={find} className="max-w-sm space-y-4">
        <div><label htmlFor="l-number" className={label}>Order number</label><input id="l-number" required autoCapitalize="characters" value={number} onChange={(e) => setNumber(e.target.value)} className={input} /></div>
        <div><label htmlFor="l-email" className={label}>Email</label><input id="l-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <button disabled={busy} className={btn}>{busy ? 'Looking…' : 'Find order'}</button>
      </form>
    </main>
  );
}
