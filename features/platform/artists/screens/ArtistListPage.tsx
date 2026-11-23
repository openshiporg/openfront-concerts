import { gql } from '../../lib/gql';
import { day } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';
import { roleFlags } from '../../lib/guard';
import { RecordEditor, type FieldSpec } from '../../components/RecordEditor';

export async function ArtistListPage() {
  const { canManageArtists } = await roleFlags('canManageArtists');
  const data = await gql(`{ artists(orderBy: [{ name: asc }], take: 200) { id name genreTags agentName agentEmail manager bio agency { id name } } tours(orderBy: [{ startAt: asc }]) { id name notes startAt endAt artist { id name } } agencies(orderBy: [{ name: asc }]) { id name } }`);
  const artistFields: FieldSpec[] = [
    { name: 'name', label: 'Name', required: true, wide: true },
    { name: 'genreTags', label: 'Genres', hint: 'comma separated', wide: true },
    { name: 'agency', label: 'Agency', kind: 'relation', options: data.agencies.map((a: any) => [a.id, a.name]) },
    { name: 'manager', label: 'Manager' },
    { name: 'agentName', label: 'Agent' },
    { name: 'agentEmail', label: 'Agent email' },
    { name: 'bio', label: 'Bio', wide: true },
  ];
  const tourFields: FieldSpec[] = [
    { name: 'name', label: 'Tour name', required: true, wide: true },
    { name: 'artist', label: 'Artist', kind: 'relation', required: true, options: data.artists.map((a: any) => [a.id, a.name]), wide: true },
    { name: 'startAt', label: 'Starts', kind: 'date' },
    { name: 'endAt', label: 'Ends', kind: 'date' },
    { name: 'notes', label: 'Notes', wide: true },
  ];
  const edit = (list: string, fields: FieldSpec[], row: any) => canManageArtists ? <RecordEditor list={list} id={row.id} values={row} fields={fields} trigger="Edit" title={`Edit ${row.name}`} /> : null;
  return (
    <Page title="Artists and tours">
      {canManageArtists ? <div className="flex flex-wrap items-start gap-2"><RecordEditor list="Artist" fields={artistFields} trigger="Add artist" title="New artist" /><RecordEditor list="Tour" fields={tourFields} trigger="Add tour" title="New tour" /></div> : null}
      <Rows empty="No artists.">{data.artists.map((a: any) => <Row key={a.id} title={a.name} meta={[a.genreTags, a.agency?.name || 'Independent', a.agentEmail].filter(Boolean).join(' · ')} right={edit('Artist', artistFields, a)} />)}</Rows>
      <h2 className="text-sm font-medium">Tours</h2>
      <Rows empty="No tours.">{data.tours.map((t: any) => <Row key={t.id} title={t.name} meta={t.artist?.name} right={<>{t.startAt ? `${day(t.startAt)} – ${day(t.endAt)}` : ''}{edit('Tour', tourFields, t)}</>} />)}</Rows>
    </Page>
  );
}
