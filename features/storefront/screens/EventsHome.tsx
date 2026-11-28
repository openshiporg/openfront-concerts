import Link from 'next/link';
import type { Show, PublicVenue } from '../lib/content';
import { billLine, genreOf } from '../lib/content';
import { usd, day, clock, dayParts, ages } from '../lib/format';
import { btn, btnQuiet } from '../lib/ui';
import { Photo } from '../components/Photo';

const state = (s: Show) => (s.status === 'sold_out' ? 'Sold out' : s.status === 'postponed' ? 'Postponed' : s.status === 'presale' ? 'Presale' : s.status === 'announced' ? 'On sale soon' : '');
const action = (s: Show) => (['on_sale', 'presale'].includes(s.status) ? 'Tickets' : 'Details');
const price = (s: Show) => (s.fromCents != null && s.status !== 'postponed' ? `From ${usd(s.fromCents, s.currencyCode)}` : '');

export function EventsHome({ shows, venues }: { shows: Show[]; venues: PublicVenue[] }) {
  // The featured show is the soonest one a buyer can act on; a postponed or not-yet-on-sale date stays in the list.
  const next = shows.find((s) => action(s) === 'Tickets') || shows[0];
  const rest = shows.filter((s) => s !== next);
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Upcoming shows</h1>
      {!shows.length ? <p className="mt-6 text-black/70">No shows are listed right now.</p> : null}

      {next ? (
        <article className="mt-8 grid gap-6 md:grid-cols-[3fr_2fr] md:items-end md:gap-10">
          <Link href={`/events/${next.id}`}><Photo src={next.photo} alt={next.title} priority className="aspect-[3/2]" /></Link>
          <div>
            <p className="text-sm font-semibold">{day(next.showAt, next.venue?.timezone)} · {clock(next.showAt, next.venue?.timezone)}{state(next) ? ` · ${state(next)}` : ''}</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight md:text-4xl"><Link href={`/events/${next.id}`} className="hover:underline underline-offset-4">{next.title}</Link></h2>
            {billLine(next) ? <p className="mt-1">{billLine(next)}</p> : null}
            <p className="mt-2 text-black/70">{[genreOf(next), next.venue ? `${next.venue.name}, ${next.venue.city}` : '', ages(next.ageRestriction)].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 text-black/70">Doors {clock(next.doorsAt, next.venue?.timezone)}{price(next) ? ` · ${price(next)}` : ''}</p>
            <Link href={`/events/${next.id}`} className={`${btn} mt-5`}>{action(next) === 'Tickets' ? 'Get tickets' : 'See details'}</Link>
          </div>
        </article>
      ) : null}

      {rest.length ? (
        <ul className="mt-12 divide-y divide-black/10 border-y border-black/10">
          {rest.map((s) => { const p = dayParts(s.showAt, s.venue?.timezone); return (
            <li key={s.id} className="grid grid-cols-[3.25rem_1fr] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[3.5rem_9rem_1fr_auto] sm:gap-x-6">
              <div className="text-center leading-tight"><div className="text-xs font-semibold uppercase text-black/60">{p.weekday}</div><div className="text-2xl font-semibold">{p.date}</div><div className="text-xs font-semibold uppercase text-black/60">{p.month}</div></div>
              <Link href={`/events/${s.id}`} tabIndex={-1} aria-hidden className="hidden sm:block"><Photo src={s.photo} alt="" className="aspect-[3/2]" /></Link>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-snug"><Link href={`/events/${s.id}`} className="hover:underline underline-offset-4">{s.title}</Link></h2>
                {billLine(s) ? <p className="text-sm">{billLine(s)}</p> : null}
                <p className="text-sm text-black/70">{[genreOf(s), s.venue?.name, clock(s.showAt, s.venue?.timezone)].filter(Boolean).join(' · ')}</p>
                <p className="text-sm text-black/70">{[state(s), price(s)].filter(Boolean).join(' · ')}</p>
              </div>
              <Link href={`/events/${s.id}`} aria-label={`${action(s)}: ${s.title}`} className={`${action(s) === 'Tickets' ? btn : btnQuiet} col-span-2 sm:col-span-1`}>{action(s)}</Link>
            </li>); })}
        </ul>
      ) : null}

      {venues.length ? (
        <section id="venues" className="mt-16 scroll-mt-6">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{venues.length === 1 ? 'The venue' : 'The venues'}</h2>
          <ul className={`mt-6 grid gap-x-6 gap-y-10 ${venues.length > 1 ? 'sm:grid-cols-3' : 'max-w-xl'}`}>
            {venues.map((v) => (
              <li key={v.id}>
                <Photo src={v.photo} alt={v.name} className="aspect-[3/2]" />
                <h3 className="mt-3 text-lg font-semibold">{v.name}</h3>
                {v.address || v.city ? <p className="text-sm text-black/70">{[v.address, v.city].filter(Boolean).join(', ')}</p> : null}
                <p className="text-sm text-black/70">{[v.capacity ? `Holds ${v.capacity.toLocaleString('en-US')}` : '', `${v.shows} upcoming ${v.shows === 1 ? 'show' : 'shows'}`].filter(Boolean).join(' · ')}</p>
              </li>))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
