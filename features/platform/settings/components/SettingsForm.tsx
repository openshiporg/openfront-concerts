'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { readQuery } from '../../lib/commands';

type Settings = { id: string; name: string; currencyCode: string; refundApprovalThresholdCents: number; supportEmail: string; supportPhone: string; refundPolicy: string };

const field = 'space-y-1.5';
const hint = 'text-sm text-muted-foreground';

/** The venue's public name and contact, its refund note and the refund approval limit. */
export function SettingsForm({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ ...settings, threshold: (settings.refundApprovalThresholdCents / 100).toFixed(2) });
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setMessage(''); setForm({ ...form, [k]: e.target.value }); };
  const cents = Math.round(Number(form.threshold) * 100);
  const valid = form.name.trim() && Number.isSafeInteger(cents) && cents >= 0 && /^[A-Za-z]{3}$/.test(form.currencyCode.trim()) && (!form.supportEmail.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.supportEmail.trim()));
  const save = () => start(async () => {
    setError(''); setMessage('');
    try {
      await readQuery(`mutation($id: ID!, $data: StoreSettingsUpdateInput!) { updateStoreSettings(where: { id: $id }, data: $data) { id } }`, { id: settings.id, data: { name: form.name.trim(), supportEmail: form.supportEmail.trim(), supportPhone: form.supportPhone.trim(), refundPolicy: form.refundPolicy.trim(), currencyCode: form.currencyCode.trim().toUpperCase(), refundApprovalThresholdCents: cents } });
      setMessage('Saved.'); router.refresh();
    } catch (e: any) { setError(e.message); }
  });
  const dis = !canEdit || pending;
  return (
    <form className="max-w-xl space-y-6" onSubmit={(e) => { e.preventDefault(); if (valid) save(); }}>
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="font-medium">Public details</h2>
        <div className={field}><label htmlFor="s-name" className="text-sm font-medium">Name customers see</label><Input id="s-name" value={form.name} onChange={set('name')} disabled={dis} className="h-11 text-base sm:h-9 sm:text-sm" /><p className={hint}>On the storefront, in the browser tab and at the top of every email.</p></div>
        <div className={field}><label htmlFor="s-email" className="text-sm font-medium">Support email</label><Input id="s-email" type="email" value={form.supportEmail} onChange={set('supportEmail')} disabled={dis} className="h-11 text-base sm:h-9 sm:text-sm" /><p className={hint}>Printed in the storefront footer and in ticket emails.</p></div>
        <div className={field}><label htmlFor="s-phone" className="text-sm font-medium">Support phone</label><Input id="s-phone" type="tel" value={form.supportPhone} onChange={set('supportPhone')} disabled={dis} className="h-11 text-base sm:h-9 sm:text-sm" /></div>
        <div className={field}><label htmlFor="s-policy" className="text-sm font-medium">Refund policy</label><Textarea id="s-policy" rows={3} value={form.refundPolicy} onChange={set('refundPolicy')} disabled={dis} className="text-base sm:text-sm" /><p className={hint}>One or two sentences, shown in the footer and on the ticket email.</p></div>
      </section>
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="font-medium">Money</h2>
        <div className={field}><label htmlFor="s-threshold" className="text-sm font-medium">Refunds above this need a second manager</label><Input id="s-threshold" inputMode="decimal" value={form.threshold} onChange={set('threshold')} disabled={dis} className="h-11 text-base sm:h-9 sm:text-sm" /><p className={hint}>In {form.currencyCode || 'USD'}. 0 means every card refund needs approval.</p></div>
        <div className={field}><label htmlFor="s-currency" className="text-sm font-medium">Currency</label><Input id="s-currency" maxLength={3} value={form.currencyCode} onChange={set('currencyCode')} disabled={dis} className="h-11 w-28 text-base uppercase sm:h-9 sm:text-sm" /></div>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        {canEdit ? <Button type="submit" className="h-11 sm:h-9" disabled={pending || !valid}>{pending ? 'Saving…' : 'Save settings'}</Button> : <p className={hint}>Your role can view these settings but not change them.</p>}
        {message ? <span role="status" className="text-sm">{message}</span> : null}
        {error ? <span role="alert" className="text-sm text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
