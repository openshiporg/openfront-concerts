import { requireAnyPermission } from '../../lib/guard';
import { gql } from '../../lib/gql';
import { money } from '../../lib/format';
import { FilterTabs, Page, Row, Rows } from '../../components/ui-bits';

export async function SettlementListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAnyPermission('canManageSettlements');
  const { status } = await searchParams;
  const data = await gql(`query($where: SettlementWhereInput!) { settlements(where: $where, orderBy: [{ createdAt: desc }], take: 100) { id version status artistTotalCents balanceDueArtistCents promoterNetCents event { title } } }`, { where: { status: status ? { equals: status } : { not: { equals: 'void' } } } });
  return (
    <Page title="Settlements">
      <FilterTabs base="/dashboard/platform/settlements" current={status} options={[['', 'Open'], ['draft', 'Draft'], ['reviewed', 'Reviewed'], ['signed_promoter', 'Promoter signed'], ['signed_artist', 'Artist signed'], ['final', 'Final']].map(([value, label]) => ({ value, label }))} />
      <Rows empty="No settlements.">
        {data.settlements.map((s: any) => <Row key={s.id} href={`/dashboard/platform/settlements/${s.id}`} title={`${s.event?.title} v${s.version}`} status={s.status} right={<>Artist {money(s.artistTotalCents)} · due {money(s.balanceDueArtistCents)} · promoter {money(s.promoterNetCents)}</>} />)}
      </Rows>
    </Page>
  );
}
