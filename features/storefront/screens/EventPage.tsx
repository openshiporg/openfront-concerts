import type { Show } from '../lib/content';
import { billLine, genreOf } from '../lib/content';
import { day, clock, ages } from '../lib/format';
import { Photo } from '../components/Photo';
import { EventBuy } from './EventBuy';

export function EventPage({ show: s }: { show: Show }) {
  const tz = s.venue?.timezone;
  return (
    <main>
      <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-end md:gap-10">
        <Photo src={s.photo} alt={s.title} priority className="aspect-[3/2]" />
        <header>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{s.title}</h1>
          {billLine(s) ? <p className="mt-2 text-lg">{billLine(s)}</p> : null}
          <dl className="mt-5 grid grid-cols-[5.5rem_1fr] gap-y-1.5 text-[15px]">
            <dt className="text-black/60">When</dt><dd>{day(s.showAt, tz)} · show {clock(s.showAt, tz)} · doors {clock(s.doorsAt, tz)}</dd>
            {s.venue ? <><dt className="text-black/60">Where</dt><dd>{s.venue.name}<span className="text-black/70">{[s.venue.address, s.venue.city].filter(Boolean).length ? ` · ${[s.venue.address, s.venue.city].filter(Boolean).join(', ')}` : ''}</span></dd></> : null}
            <dt className="text-black/60">Ages</dt><dd>{ages(s.ageRestriction)}</dd>
            {genreOf(s) ? <><dt className="text-black/60">Music</dt><dd>{genreOf(s)}</dd></> : null}
          </dl>
          {s.description ? <p className="mt-4 max-w-prose">{s.description}</p> : null}
        </header>
      </div>
      <EventBuy eventId={s.id} status={s.status} />
    </main>
  );
}
