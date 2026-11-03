import { gql } from '../../lib/gql';
import { computeSettlement } from '@/features/keystone/lib/settlement';
import { money, label } from '../../lib/format';
import { FilterTabs, Page, Row, Rows } from '../../components/ui-bits';

/** Calculator preview: the pure settlement function over projected sales. */
export async function DealListPage({ searchParams }: { searchParams: Promise<{ status?: string; gross?: string }> }) {
  const { status, gross } = await searchParams;
  const projected = Math.max(0, Math.round(Number(gross || 2000000)));
  const data = await gql(`query($where: OfferWhereInput!) { offers(where: $where, orderBy: [{ createdAt: desc }], take: 100) { id status dealType guaranteeCents percentageBps promoterProfitBps expenseCapCents depositCents event { id title } artist { name } } }`, { where: status ? { status: { equals: status } } : {} });
  const preview = (o: any) => {
    try { return computeSettlement({ grossCents: projected, taxCents: 0, passthroughFeesCents: 0, cappedExpensesCents: o.expenseCapCents, uncappedExpensesCents: 0, expenseCapCents: o.expenseCapCents, guaranteeCents: o.guaranteeCents, percentageBps: o.percentageBps, promoterProfitBps: o.promoterProfitBps, depositsPaidCents: o.depositCents, dealType: o.dealType }); } catch { return null; }
  };
  return (
    <Page title="Deals">
      <FilterTabs base="/dashboard/platform/deals" current={status} options={[['', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['accepted', 'Accepted'], ['contracted', 'Contracted'], ['settled', 'Settled']].map(([value, label]) => ({ value, label }))} />
      <p className="text-sm text-muted-foreground">Projected net gross {money(projected)}. Add ?gross=cents to change the projection.</p>
      <Rows empty="No deals.">
        {data.offers.map((o: any) => { const p = preview(o); return <Row key={o.id} href={`/dashboard/platform/events/${o.event.id}?tab=billing`} title={`${o.artist.name}: ${o.event.title}`} status={o.status} meta={`${label(o.dealType)} · guarantee ${money(o.guaranteeCents)} · ${o.percentageBps / 100}%`} right={p ? <>Artist {money(p.artistTotalCents)} · promoter {money(p.promoterNetCents)}</> : null} />; })}
      </Rows>
    </Page>
  );
}
