import { gql } from '../../lib/gql';
import { label } from '../../lib/format';
import { ActionButton } from '../../components/ActionButton';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function VenueListPage() {
  const data = await gql(`{ venues(orderBy: [{ name: asc }]) { id name city capacity ownedByPromoter seatingChart_venue { id name version status chartSection_chart(orderBy: [{ sort: asc }]) { id name kind capacity } } } }`);
  return (
    <Page title="Venues and seating charts">
      <Rows empty="No venues.">
        {data.venues.map((v: any) => <Row key={v.id} title={v.name} meta={`${v.city} · capacity ${v.capacity} · ${v.ownedByPromoter ? 'owned' : 'partner'}`} right={v.seatingChart_venue.map((c: any) => <div key={c.id}>{c.name} v{c.version} <span className="font-mono text-xs uppercase tracking-wide">{label(c.status)}</span> {c.status === 'draft' ? <ActionButton command="publishSeatingChart" input={{ seatingChartId: c.id }}>Publish chart</ActionButton> : null}: {c.chartSection_chart.map((s: any) => `${s.name} ${s.kind === 'ga' ? 'GA' : 'reserved'} ${s.capacity}`).join(', ')}</div>)} />)}
      </Rows>
    </Page>
  );
}
