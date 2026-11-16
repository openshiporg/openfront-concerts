'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, Ticket, Armchair, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { api, showTime } from '../lib/api';

const TILES = ['from-purple-500 to-fuchsia-900', 'from-amber-500 to-orange-900', 'from-sky-500 to-indigo-900', 'from-rose-500 to-purple-900'];
const dayParts = (iso: string, tz?: string) => {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: tz || 'America/Los_Angeles' }).format(new Date(iso));
  return { m: f({ month: 'short' }).toUpperCase(), d: f({ day: '2-digit' }) };
};
const card = 'rounded-3xl bg-[#f7f7f7] p-4 shadow-sm sm:p-5';
const pill = 'inline-flex min-h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-sm font-semibold text-white';

export function EventsHome() {
  const [events, setEvents] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('{ eventsOnSale }').then((d) => setEvents(d.eventsOnSale)).catch((e) => setError(e.message)); }, []);
  const list = events || [];
  const featured = list[0];
  return (
    <main className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-[#17122e] p-6 text-white sm:p-8" style={{ backgroundImage: 'radial-gradient(ellipse at 80% 0%, rgba(217,70,239,.65), transparent 55%), radial-gradient(ellipse at 60% 100%, rgba(99,102,241,.5), transparent 55%)' }}>
        <h1 className="max-w-xs text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Live music, every week</h1>
        <p className="mt-3 max-w-[16rem] text-sm opacity-80">Reserve seats or grab general admission for the next show.</p>
        <Link href="#events" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#141414]">Browse Events <ArrowRight className="size-4" /></Link>
      </section>

      <section className={`${card} grid grid-cols-2 gap-y-4 text-center text-xs font-semibold sm:grid-cols-4`}>
        {[[CalendarDays, 'World-Class Shows'], [Ticket, 'Instant Tickets'], [Armchair, 'Choose Your Seat'], [UtensilsCrossed, 'Food & Drinks']].map(([I, t]: any) => (
          <div key={t} className="flex flex-col items-center gap-2 px-2"><I className="size-6" strokeWidth={1.5} />{t}</div>))}
      </section>

      <section id="events" className={`${card} space-y-3`}>
        <header className="flex items-center justify-between"><h2 className="text-2xl font-semibold tracking-tight">Upcoming Shows</h2><Link className="flex min-h-11 items-center text-sm font-semibold" href="/lookup">Find my order</Link></header>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {events === null && !error ? <p className="text-sm">Loading…</p> : null}
        <ul className="space-y-3">
          {list.map((e, i) => { const p = dayParts(e.showAt, e.venue?.timezone); return (
            <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-1.5 sm:gap-4">
              <div className={`size-14 shrink-0 rounded-2xl bg-gradient-to-br sm:size-[72px] ${TILES[i % TILES.length]}`} aria-hidden />
              <div className="w-9 shrink-0 text-center sm:w-11 leading-tight"><div className="text-xs font-semibold">{p.m}</div><div className="text-xl font-bold">{p.d}</div></div>
              <Link href={`/events/${e.id}`} className="min-w-0 flex-1 border-l border-black/10 pl-3">
                <div className="font-semibold leading-tight">{e.title}</div>
                <div className="truncate text-sm leading-tight opacity-60">{e.venue?.name}</div>
                {['sold_out', 'postponed'].includes(e.status) ? <div className="text-xs font-semibold uppercase opacity-70">{String(e.status).replace(/_/g, ' ')}</div> : null}
              </Link>
              <Link href={`/events/${e.id}`} className="mr-1 inline-flex min-h-11 items-center rounded-full bg-[#141414] px-4 text-sm font-semibold text-white">Tickets</Link>
            </li>); })}
        </ul>
        {events && !events.length ? <p className="text-sm">No events on sale.</p> : null}
      </section>

      {featured ? <section className={`${card} grid items-center gap-5 sm:grid-cols-2`}>
        <div className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-amber-400 via-orange-600 to-stone-900 sm:aspect-square" aria-hidden />
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Featured show</div>
          <h2 className="text-4xl font-semibold leading-none tracking-tight">{featured.title}</h2>
          <p className="text-sm opacity-70">{featured.venue?.name}{featured.venue?.city ? `, ${featured.venue.city}` : ''}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{showTime(featured.showAt, featured.venue?.timezone)}</span><span>Doors {showTime(featured.doorsAt, featured.venue?.timezone)}</span></p>
          <Link href={`/events/${featured.id}`} className={pill}>Get Tickets <ArrowRight className="size-4" /></Link>
        </div>
      </section> : null}
    </main>
  );
}
