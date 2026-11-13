'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, showTime } from '../lib/api';

export function EventsHome() {
  const [events, setEvents] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('{ eventsOnSale }').then((d) => setEvents(d.eventsOnSale)).catch((e) => setError(e.message)); }, []);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-semibold">Upcoming events</h1><Link className="inline-flex min-h-11 items-center text-sm underline" href="/lookup">Find my order</Link></header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {events === null && !error ? <p className="text-sm">Loading…</p> : null}
      <ul className="divide-y rounded-lg border">
        {(events || []).map((e) => (
          <li key={e.id}><Link href={`/events/${e.id}`} className="block p-4 hover:bg-black/5">
            <div className="font-medium">{e.title}</div>
            <div className="text-sm opacity-70">{e.venue?.name}, {e.venue?.city} · {showTime(e.showAt, e.venue?.timezone)} · doors {showTime(e.doorsAt, e.venue?.timezone)}</div>
            <div className="font-mono text-xs uppercase tracking-wide opacity-70">{String(e.status).replace(/_/g, ' ')}</div>
          </Link></li>
        ))}
      </ul>
      {events && !events.length ? <p className="text-sm">No events on sale.</p> : null}
    </main>
  );
}
