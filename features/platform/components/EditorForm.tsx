'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runTyped } from '../lib/commands';

/** Dollars text → integer cents, or NaN. Accepts "45", "45.5", "1,250.00". */
export function toCents(text: string): number {
  const t = text.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  const [whole, frac = ''] = t.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}
export const fromCents = (c: number | null | undefined) => ((c ?? 0) / 100).toFixed(2);
/** Percent text → basis points, or NaN. "12.5" → 1250. */
export function toBps(text: string): number {
  const t = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(Number(t) * 100);
}
export const fromBps = (b: number | null | undefined) => String((b ?? 0) / 100);

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? 'col-span-2 flex min-w-0 flex-col gap-1 text-sm' : 'flex min-w-0 flex-col gap-1 text-sm'}><span className="text-muted-foreground">{label}</span>{children}</label>;
}
export function TextField({ label, value, onChange, wide, inputMode, placeholder }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean; inputMode?: 'decimal' | 'numeric' | 'text'; placeholder?: string }) {
  return <Field label={label} wide={wide}><Input value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} placeholder={placeholder} aria-label={label} className="h-9 min-w-0" /></Field>;
}

/**
 * Toggle-open editor panel that submits one command with a stable idempotency key per open form.
 * build() returns the command input or a string error shown before submitting.
 */
export function EditorPanel({ trigger, title, command, build, children, onDone, variant = 'outline' }: { trigger: string; title: string; command: string; build: () => Record<string, unknown> | string; children: ReactNode; onDone?: (r: any) => string | void; variant?: 'outline' | 'default' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  if (!open) return <Button size="sm" variant={variant} onClick={() => { setOpen(true); setError(''); }}>{trigger}</Button>;
  const built = build();
  const submit = async () => {
    if (typeof built === 'string') return;
    setPending(true); setError('');
    try {
      const r = await runTyped(command, 'OperatorCommandInput', { ...built, idempotencyKey: key });
      onDone?.(r); setKey(crypto.randomUUID()); setOpen(false); router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setPending(false); }
  };
  return (
    <section className="w-full space-y-3 rounded-lg border bg-background p-4 sm:max-w-xl">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
      {typeof built === 'string' ? <p className="text-sm text-muted-foreground">{built}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || typeof built === 'string'} onClick={submit}>{pending ? 'Working…' : 'Save'}</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
