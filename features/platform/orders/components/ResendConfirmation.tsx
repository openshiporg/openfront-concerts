'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { readQuery } from '../../lib/commands';

export function ResendConfirmation({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return <div className="space-y-2"><Button variant="outline" className="min-h-11" disabled={pending} onClick={() => start(async () => {
    setMessage(''); setError('');
    try { const r = await readQuery('mutation($id: ID!) { resendOrderConfirmation(orderId: $id) }', { id: orderId }); if (!r.resendOrderConfirmation?.sent) throw new Error('The email was not sent. Try again.'); setMessage('Confirmation email sent.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'The email was not sent.'); }
  })}>{pending ? 'Sending…' : 'Resend ticket email'}</Button>{message ? <p role="status" className="text-sm">{message}</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div>;
}
