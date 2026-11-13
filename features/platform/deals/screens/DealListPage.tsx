import { requireAnyPermission } from '../../lib/guard';
import { gql } from '../../lib/gql';
import { computeSettlement } from '@/features/keystone/lib/settlement';
import { money, label } from '../../lib/format';
import Link from 'next/link';
import { FilterTabs, Page, Row, Rows } from '../../components/ui-bits';
import { OfferActions } from '../components/OfferActions';

/** Calculator preview: the pure settlement function over projected sales. */
export async function DealListPage({ searchParams }: { searchParams: Promise<{ status?: string; gross?: string }> }) {
  await requireAnyPermission('canManageDeals', 'canManageSettlements');
  const { status, gross } = await searchParams;
  const projected = Math.max(0, Math.round(Number(gross || 2000000)));
  const data = await gql(`query($where: OfferWhereInput!) { offers(where: $where, orderBy: [{ createdAt: desc }], take: 100) { id status dealType guaranteeCents percentageBps promoterProfitBps expenseCapCents depositCents event { id title } artist { name } } }`, { where: status ? { status: { equals: status } } : {} });
  const preview = (o: any) => {
    try { return computeSettlement({ grossCents: projected, taxCents: 0, passthroughFeesCents: 0, cappedExpensesCents: o.expenseCapCents, uncappedExpensesCents: 0, expenseCapCents: o.expenseCapCents, guaranteeCents: o.guaranteeCents, percentageBps: o.percentageBps, promoterProfitBps: o.promoterProfitBps, depositsPaidCents: o.depositCents, dealType: o.dealType }); } catch { return null; }
  };
  return (
    <Page title="Deals">
      <FilterTabs base="/dashboard/platform/deals" current={status} options={[['', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['accepted', 'Accepted'], ['contracted', 'Contracted'], ['declined', 'Declined'], ['superseded', 'Superseded'], ['settled', 'Settled']].map(([value, label]) => ({ value, label }))} />
      <p className="text-sm text-muted-foreground">Projected net gross {money(projected)}. Add ?gross=cents to change the projection.</p>
      <Rows empty="No deals.">
        {data.offers.map((o: any) => { const p = preview(o); return <Row key={o.id} title={<Link href={`/dashboard/platform/events/${o.event.id}?tab=billing`} className="hover:underline">{o.artist.name}: {o.event.title}</Link>} status={o.status} meta={<div className="space-y-2"><div>{`${label(o.dealType)} · guarantee ${money(o.guaranteeCents)} · ${o.percentageBps / 100}%`}</div><OfferActions offerId={o.id} status={o.status} /></div>} right={p ? <>Artist {money(p.artistTotalCents)} · promoter {money(p.promoterNetCents)}</> : null} />; })}
      </Rows>
    </Page>
  );
}
