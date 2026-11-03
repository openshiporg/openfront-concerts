import { gql } from '../../lib/gql';
import { day, label } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';
import { HoldActions } from '../components/HoldActions';

export async function CalendarPage() {
  const data = await gql(`{ dateHolds(orderBy: [{ date: asc }, { rank: asc }], take: 200) { id date rank status expiresAt venue { name } artist { name } event { id title } } }`);
  const groups = new Map<string, any[]>();
  for (const h of data.dateHolds) { const key = `${h.venue?.name} · ${day(h.date)}`; groups.set(key, [...(groups.get(key) || []), h]); }
  return (
    <Page title="Calendar and holds">
      {[...groups.entries()].map(([key, holds]) => (
        <section key={key} className="space-y-2"><h2 className="text-sm font-medium">{key}</h2>
          <Rows>{holds.map((h) => <Row key={h.id} title={`${h.rank === 1 ? '1st' : h.rank === 2 ? '2nd' : `${h.rank}th`} hold: ${h.artist?.name || 'Open'}`} status={h.status} meta={h.event ? h.event.title : `Expires ${day(h.expiresAt)}`} right={h.event ? null : <HoldActions holdId={h.id} status={h.status} />} />)}</Rows>
        </section>
      ))}
      {!groups.size ? <Rows empty="No holds.">{[]}</Rows> : null}
    </Page>
  );
}
