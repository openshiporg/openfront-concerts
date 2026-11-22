import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { label } from '../lib/format';

const DOT: Record<string, string> = {
  on_sale: 'bg-emerald-500', presale: 'bg-sky-500', announced: 'bg-sky-500', hold: 'bg-amber-500', sold_out: 'bg-violet-500',
  doors: 'bg-emerald-500', in_progress: 'bg-emerald-500', completed: 'bg-zinc-400', settling: 'bg-amber-500', settled: 'bg-zinc-400',
  cancelled: 'bg-red-500', postponed: 'bg-orange-500', paid: 'bg-emerald-500', pending_payment: 'bg-amber-500', refunded: 'bg-red-500',
  partially_refunded: 'bg-orange-500', draft: 'bg-zinc-400', sent: 'bg-sky-500', accepted: 'bg-emerald-500', contracted: 'bg-emerald-500',
  declined: 'bg-red-500', reviewed: 'bg-sky-500', signed_promoter: 'bg-amber-500', signed_artist: 'bg-amber-500', final: 'bg-emerald-500',
  void: 'bg-red-500', superseded: 'bg-zinc-400', balanced: 'bg-emerald-500', over: 'bg-amber-500', short: 'bg-red-500', closed: 'bg-zinc-400', held: 'bg-amber-500', challenged: 'bg-orange-500', confirmed: 'bg-emerald-500', released: 'bg-zinc-400',
  valid: 'bg-emerald-500', checked_in: 'bg-sky-500', active: 'bg-emerald-500', paused: 'bg-amber-500', expired: 'bg-zinc-400',
};

/** Status is a mono uppercase label with a dot; never a badge or pill. */
export function StatusLabel({ status }: { status?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground">
      <span className={cn('size-2 shrink-0 rounded-full', DOT[status || ''] || 'bg-zinc-400')} aria-hidden />
      {label(status)}
    </span>
  );
}

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-10 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Recessed track with raised active pill, as the in-page tab convention. */
export function FilterTabs({ base, param = 'status', current, options }: { base: string; param?: string; current?: string; options: { value: string; label: string; count?: number }[] }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {options.map((o) => (
          <Link key={o.value} href={o.value ? `${base}?${param}=${o.value}` : base} className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-sm', (current || '') === o.value ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground')}>
            {o.label}{typeof o.count === 'number' ? ` ${o.count}` : ''}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Rows({ children, empty }: { children: ReactNode[] | ReactNode; empty?: string }) {
  const items = Array.isArray(children) ? children : [children];
  if (!items.length) return <p className="rounded-lg border p-6 text-sm text-muted-foreground">{empty || 'No records.'}</p>;
  return <div className="divide-y rounded-lg border bg-background">{items}</div>;
}

export function Row({ href, title, status, meta, right }: { href?: string; title: ReactNode; status?: string | null; meta?: ReactNode; right?: ReactNode }) {
  const body = (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-medium">{title}</span>{status ? <StatusLabel status={status} /> : null}</div>
        {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {right ? <div className="text-sm tabular-nums">{right}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block hover:bg-muted/50">{body}</Link> : body;
}

export function Stat({ name, value }: { name: string; value: ReactNode }) {
  return <div className="rounded-lg border p-3"><div className="text-sm text-muted-foreground">{name}</div><div className="text-lg font-semibold tabular-nums">{value}</div></div>;
}
