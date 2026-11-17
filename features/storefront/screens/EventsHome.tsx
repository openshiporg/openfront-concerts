'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CalendarDays, Ticket, Armchair, UtensilsCrossed, ArrowRight, MapPin, Users } from 'lucide-react';
import type { EventExtra, PublicVenue } from '../lib/content';
import { api, showTime } from '../lib/api';

// Stage photos, picked by the headliner's genre. Instruments and rooms only: an artist's own picture is theirs to upload.
const BY_GENRE: [RegExp, string][] = [
  [/electronic|synth|dream|house|techno|ambient/i, 'synth'],
  [/jazz|blues|brass|funk/i, 'sax'],
  [/folk|country|songwriter|acoustic|americana|bluegrass/i, 'acoustic'],
  [/punk|metal|hardcore|drum/i, 'drums'],
  [/pop|soul|r&b|rnb|hip|rap|vocal/i, 'mic'],
  [/rock|indie|alternative|guitar/i, 'guitar'],
];
const stagePhoto = (genre: string) => `/storefront/${BY_GENRE.find(([re]) => re.test(genre))?.[1] || 'lights'}.webp`;
const venuePhoto = (name: string) => `/storefront/${/amphi|park|open air|garden|field|bowl/i.test(name) ? 'amphitheatre' : /theat|hall|opera|auditorium|palace/i.test(name) ? 'theatre' : 'club'}.webp`;
const dayParts = (iso: string, tz?: string) => {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: tz || 'America/Los_Angeles' }).format(new Date(iso));
  return { m: f({ month: 'short' }).toUpperCase(), d: f({ day: '2-digit' }) };
};
const card = 'rounded-3xl bg-[#f7f7f7] p-4 shadow-sm sm:p-5';
const pill = 'inline-flex min-h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-sm font-semibold text-white';

export function EventsHome({ extras = {}, venues = [] }: { extras?: Record<string, EventExtra>; venues?: PublicVenue[] }) {
  const [events, setEvents] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api('{ eventsOnSale }').then((d) => setEvents(d.eventsOnSale)).catch((e) => setError(e.message)); }, []);
  const list = events || [];
  const featured = list.find((e) => ['on_sale', 'presale'].includes(e.status)) || list[0];
  const genreOf = (id: string) => extras[id]?.artists[0]?.genre || '';
  const supportOf = (id: string) => (extras[id]?.artists || []).slice(1).map((a) => a.name);
  return (
    <main className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-[#17122e] p-6 text-white sm:p-8">
        <Image src="/storefront/hero.webp" alt="A band on stage with the crowd in front" fill priority sizes="(min-width: 768px) 736px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#17122e] via-[#17122e]/70 to-transparent" aria-hidden />
        <div className="relative">
          <h1 className="max-w-xs text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">Live music, every week</h1>
          <p className="mt-3 max-w-[16rem] text-sm opacity-90">Reserve seats or grab general admission for the next show.</p>
          <Link href="#events" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#141414]">Browse Events <ArrowRight className="size-4" /></Link>
        </div>
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
          {list.map((e) => { const p = dayParts(e.showAt, e.venue?.timezone); return (
            <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-1.5 sm:gap-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-[#17122e] sm:size-[72px]"><Image src={stagePhoto(genreOf(e.id))} alt="" fill sizes="72px" className="object-cover" /></div>
              <div className="w-9 shrink-0 text-center sm:w-11 leading-tight"><div className="text-xs font-semibold">{p.m}</div><div className="text-xl font-bold">{p.d}</div></div>
              <Link href={`/events/${e.id}`} className="min-w-0 flex-1 border-l border-black/10 pl-3">
                <div className="font-semibold leading-tight">{e.title}</div>
                <div className="truncate text-sm leading-tight opacity-60">{[genreOf(e.id), e.venue?.name].filter(Boolean).join(' · ')}</div>
                {['sold_out', 'postponed'].includes(e.status) ? <div className="text-xs font-semibold uppercase opacity-70">{String(e.status).replace(/_/g, ' ')}</div> : null}
              </Link>
              <Link href={`/events/${e.id}`} className="mr-1 inline-flex min-h-11 items-center rounded-full bg-[#141414] px-4 text-sm font-semibold text-white">Tickets</Link>
            </li>); })}
        </ul>
        {events && !events.length ? <p className="text-sm">No events on sale.</p> : null}
      </section>

      {featured ? <section className={`${card} grid items-center gap-5 sm:grid-cols-2`}>
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#17122e] sm:aspect-square"><Image src={stagePhoto(genreOf(featured.id))} alt="" fill sizes="(min-width: 640px) 340px, 100vw" className="object-cover" /></div>
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Featured show</div>
          <h2 className="text-4xl font-semibold leading-none tracking-tight">{featured.title}</h2>
          {supportOf(featured.id).length ? <p className="text-sm">With {supportOf(featured.id).join(', ')}</p> : null}
          <p className="text-sm opacity-70">{[genreOf(featured.id), `${featured.venue?.name || ''}${featured.venue?.city ? `, ${featured.venue.city}` : ''}`].filter(Boolean).join(' · ')}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="flex items-center gap-1.5 font-semibold"><CalendarDays className="size-4" />{showTime(featured.showAt, featured.venue?.timezone)}</span><span>Doors {showTime(featured.doorsAt, featured.venue?.timezone)}</span></p>
          <Link href={`/events/${featured.id}`} className={pill}>Get Tickets <ArrowRight className="size-4" /></Link>
        </div>
      </section> : null}

      {venues.length ? <section id="venues" className={`${card} scroll-mt-4 space-y-4`}>
        <header><div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{venues.length === 1 ? 'The venue' : 'The venues'}</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">Where we play</h2></header>
        <ul className={`grid gap-3 ${venues.length > 1 ? 'sm:grid-cols-3' : ''}`}>
          {venues.map((v) => (
            <li key={v.id} className="overflow-hidden rounded-2xl bg-white/60">
              <div className={`relative bg-[#17122e] ${venues.length > 1 ? 'aspect-[16/9] sm:aspect-[4/3]' : 'aspect-[16/9]'}`}><Image src={venuePhoto(v.name)} alt="" fill sizes="(min-width: 640px) 240px, 100vw" className="object-cover" /></div>
              <div className="space-y-1.5 p-3 text-sm">
                <h3 className="text-base font-semibold leading-tight">{v.name}</h3>
                {v.address || v.city ? <p className="flex items-start gap-1.5 opacity-70"><MapPin className="mt-0.5 size-4 shrink-0" />{[v.address, v.city].filter(Boolean).join(', ')}</p> : null}
                {v.capacity ? <p className="flex items-center gap-1.5 opacity-70"><Users className="size-4 shrink-0" />{v.capacity.toLocaleString('en-US')} capacity</p> : null}
                <p className="font-semibold">{v.shows} {v.shows === 1 ? 'show' : 'shows'} listed</p>
              </div>
            </li>))}
        </ul>
      </section> : null}
    </main>
  );
}
