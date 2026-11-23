'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readQuery } from '../lib/commands';

export type FieldSpec = { name: string; label: string; kind?: 'text' | 'int' | 'money' | 'percent' | 'date' | 'select' | 'bool' | 'relation' | 'discount'; options?: [string, string][]; required?: boolean; wide?: boolean; hint?: string };

const toInput = (f: FieldSpec, v: any, row?: Record<string, any>): string => {
  if (f.kind === 'discount') return row?.discountType === 'percent_bps' ? String((v ?? 0) / 100) : row?.discountType === 'amount_cents' ? ((v ?? 0) / 100).toFixed(2) : '';
  if (v === null || v === undefined) return f.kind === 'bool' ? 'false' : '';
  if (f.kind === 'money') return (v / 100).toFixed(2);
  if (f.kind === 'percent') return String(v / 100);
  if (f.kind === 'date') return String(v).slice(0, 10);
  if (f.kind === 'relation') return v?.id || '';
  return String(v);
};
function toValue(f: FieldSpec, s: string, all: Record<string, string> = {}): any {
  const t = s.trim();
  if (f.kind === 'discount') {
    if (all.discountType === 'comp') return 0;
    const n = Number(t.replace(/[$,%]/g, ''));
    if (!t || !Number.isFinite(n) || n <= 0) throw new Error(`${f.label}: enter a number above 0`);
    if (all.discountType === 'percent_bps' && n > 100) throw new Error(`${f.label}: at most 100%`);
    return Math.round(n * 100);
  }
  if (f.kind === 'relation') return t ? { connect: { id: t } } : { disconnect: true };
  if (f.kind === 'bool') return t === 'true';
  if (!t) return f.kind === 'text' || !f.kind ? '' : null;
  if (f.kind === 'int') { const n = Number(t); if (!Number.isInteger(n)) throw new Error(`${f.label}: whole number`); return n; }
  if (f.kind === 'money') { if (!/^\d+(\.\d{1,2})?$/.test(t.replace(/[$,]/g, ''))) throw new Error(`${f.label}: dollars, e.g. 45.00`); return Math.round(Number(t.replace(/[$,]/g, '')) * 100); }
  if (f.kind === 'percent') { const n = Number(t); if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${f.label}: 0 to 100`); return Math.round(n * 100); }
  if (f.kind === 'date') return new Date(`${t}T12:00:00Z`).toISOString();
  return t;
}

/** Create or edit one Keystone record from a platform page; list access control decides who may save. */
export function RecordEditor({ list, id, values, fields, trigger, title }: { list: string; id?: string; values?: Record<string, any>; fields: FieldSpec[]; trigger: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, toInput(f, values?.[f.name], values)])));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!open) return <Button size="sm" variant={id ? 'outline' : 'default'} onClick={() => { setOpen(true); setError(''); }}>{trigger}</Button>;
  const save = async () => {
    setError('');
    try {
      const data: Record<string, any> = {};
      for (const f of fields) {
        const v = toValue(f, state[f.name], state);
        if (f.required && (v === '' || v === null)) throw new Error(`${f.label} is required`);
        if (f.required && f.kind === 'relation' && v.disconnect) throw new Error(`${f.label} is required`);
        if (!id && (v === '' || v === null || v?.disconnect)) continue;
        data[f.name] = v;
      }
      setPending(true);
      const payload = data;
      const op = id ? `update${list}(where: { id: $id }, data: $data) { id }` : `create${list}(data: $data) { id }`;
      await readQuery(`mutation(${id ? '$id: ID!, ' : ''}$data: ${list}${id ? 'Update' : 'Create'}Input!) { ${op} }`, id ? { id, data: payload } : { data: payload });
      setOpen(false); router.refresh();
    } catch (e: any) { setError(e.message); } finally { setPending(false); }
  };
  return (
    <section className="w-full space-y-3 rounded-lg border bg-background p-4 text-left sm:max-w-xl">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.name} className={`${f.wide ? 'col-span-2 ' : ''}flex min-w-0 flex-col gap-1 text-sm`}>
            <span className="text-muted-foreground">{f.label}{f.hint ? <span className="text-xs"> ({f.hint})</span> : null}</span>
            {f.kind === 'select' || f.kind === 'bool' || f.kind === 'relation'
              ? <select className="h-11 rounded-md border bg-background px-3 text-base" value={state[f.name]} onChange={(e) => setState((s) => ({ ...s, [f.name]: e.target.value }))}>{(f.kind === 'bool' ? [['true', 'Yes'], ['false', 'No']] as [string, string][] : f.kind === 'relation' ? [['', f.required ? 'Choose…' : 'None'] as [string, string], ...(f.options || [])] : [...(f.options || []), ...(state[f.name] && !(f.options || []).some(([v]) => v === state[f.name]) ? [[state[f.name], state[f.name]] as [string, string]] : [])]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <Input className="h-11 min-w-0 text-base" type={f.kind === 'date' ? 'date' : 'text'} inputMode={f.kind === 'int' ? 'numeric' : f.kind === 'money' || f.kind === 'percent' ? 'decimal' : undefined} value={state[f.name]} onChange={(e) => setState((s) => ({ ...s, [f.name]: e.target.value }))} />}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save'}</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
