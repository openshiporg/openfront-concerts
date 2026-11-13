import { gql } from '../../lib/gql';
import { roleFlags } from '../../lib/guard';
import { grossReaders } from '@/features/keystone/access';
import { money, when } from '../../lib/format';
import { FilterTabs, Page, Row, Rows } from '../../components/ui-bits';

const STATUSES = [['', 'All'], ['on_sale', 'On sale'], ['presale', 'Presale'], ['announced', 'Announced'], ['hold', 'Hold'], ['completed', 'Completed'], ['settling', 'Settling'], ['settled', 'Settled'], ['postponed', 'Postponed']];

export async function EventListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const can = await roleFlags(...grossReaders);
  const seesGross = grossReaders.some((p) => can[p]);
  const data = await gql(`query($where: EventWhereInput!) { events(where: $where, orderBy: [{ showAt: asc }], take: 100) { id title status showAt venue { name timezone } sold open ${seesGross ? 'gross' : ''} } }`, { where: status ? { status: { equals: status } } : {} });
  return (
    <Page title="Events">
      <FilterTabs base="/dashboard/platform/events" current={status} options={STATUSES.map(([value, label]) => ({ value, label }))} />
      <Rows empty="No events.">
        {data.events.map((e: any) => <Row key={e.id} href={`/dashboard/platform/events/${e.id}`} title={e.title} status={e.status} meta={`${e.venue?.name} · ${when(e.showAt, e.venue?.timezone)}`} right={<>{e.sold} sold · {e.open} open{seesGross ? ` · ${money(e.gross)}` : ''}</>} />)}
      </Rows>
    </Page>
  );
}
