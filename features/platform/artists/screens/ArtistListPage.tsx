import { gql } from '../../lib/gql';
import { day } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function ArtistListPage() {
  const data = await gql(`{ artists(orderBy: [{ name: asc }], take: 200) { id name genreTags agentName agentEmail agency { name } } tours(orderBy: [{ startAt: asc }]) { id name startAt endAt artist { name } } }`);
  return (
    <Page title="Artists and tours">
      <Rows empty="No artists.">{data.artists.map((a: any) => <Row key={a.id} title={a.name} meta={`${a.genreTags} · ${a.agency?.name || 'Independent'} · ${a.agentEmail}`} />)}</Rows>
      <h2 className="text-sm font-medium">Tours</h2>
      <Rows empty="No tours.">{data.tours.map((t: any) => <Row key={t.id} title={t.name} meta={t.artist?.name} right={`${day(t.startAt)} – ${day(t.endAt)}`} />)}</Rows>
    </Page>
  );
}
