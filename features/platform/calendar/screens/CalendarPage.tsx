import { gql } from '../../lib/gql';
import { day } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';
import { HoldActions } from '../components/HoldActions';
import { PlaceHoldForm } from '../components/PlaceHoldForm';

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

export async function CalendarPage() {
  const data = await gql(`{
    dateHolds(orderBy: [{ date: asc }, { rank: asc }], take: 200) { id date rank status expiresAt venue { id name timezone } artist { name } event { id title } }
    venues(orderBy: [{ name: asc }], take: 100) { id name city }
    artists(orderBy: [{ name: asc }], take: 300) { id name }
    seatingCharts(where: { status: { equals: "published" } }, take: 200) { id name version venue { id } }
  }`);
  const venues = data.venues.map((v: any) => ({ value: v.id, label: `${v.name}, ${v.city}` }));
  const artists = data.artists.map((a: any) => ({ value: a.id, label: a.name }));
  const chartsFor = (venueId?: string) => data.seatingCharts.filter((c: any) => c.venue?.id === venueId).map((c: any) => ({ value: c.id, label: `${c.name} v${c.version}` }));
  const groups = new Map<string, any[]>();
  for (const h of data.dateHolds) { const key = `${h.venue?.name} · ${day(h.date)}`; groups.set(key, [...(groups.get(key) || []), h]); }
  return (
    <Page title="Calendar and holds" action={<PlaceHoldForm venues={venues} artists={artists} />}>
      {[...groups.entries()].map(([key, holds]) => (
        <section key={key} className="space-y-2"><h2 className="text-sm font-medium">{key}</h2>
          <Rows>{holds.map((h) => <Row key={h.id} title={`${ordinal(h.rank)} hold: ${h.artist?.name || 'Open'}`} status={h.status} meta={h.event ? h.event.title : `Expires ${day(h.expiresAt)}`} right={h.event ? null : <HoldActions holdId={h.id} status={h.status} charts={chartsFor(h.venue?.id)} artist={h.artist?.name} />} />)}</Rows>
        </section>
      ))}
      {!groups.size ? <Rows empty="No holds.">{[]}</Rows> : null}
    </Page>
  );
}
