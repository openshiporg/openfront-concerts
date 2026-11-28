import { requireAnyPermission } from '../../lib/guard';
import { gql } from '../../lib/gql';
import { computeSettlement } from '@/features/keystone/lib/settlement';
import { money, label } from '../../lib/format';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterTabs, Page, Row, Rows } from '../../components/ui-bits';
import { OfferActions } from '../components/OfferActions';

/** Calculator preview: the pure settlement function over projected sales. */
export async function DealListPage({ searchParams }: { searchParams: Promise<{ status?: string; gross?: string; sales?: string }> }) {
  await requireAnyPermission('canManageDeals', 'canManageSettlements');
  const { status, gross, sales } = await searchParams;
  // Projected ticket sales in dollars from the form; the older ?gross= value in cents still works.
  const dollars = Number(String(sales ?? '').replace(/[$,\s]/g, ''));
  const projected = sales && Number.isFinite(dollars) ? Math.max(0, Math.round(dollars * 100)) : Math.max(0, Math.round(Number(gross || 2000000)) || 0);
  const data = await gql(`query($where: OfferWhereInput!) { offers(where: $where, orderBy: [{ createdAt: desc }], take: 100) { id status dealType guaranteeCents percentageBps promoterProfitBps expenseCapCents depositCents event { id title } artist { name } } }`, { where: status ? { status: { equals: status } } : {} });
  const preview = (o: any) => {
    try { return computeSettlement({ grossCents: projected, taxCents: 0, passthroughFeesCents: 0, cappedExpensesCents: o.expenseCapCents, uncappedExpensesCents: 0, expenseCapCents: o.expenseCapCents, guaranteeCents: o.guaranteeCents, percentageBps: o.percentageBps, promoterProfitBps: o.promoterProfitBps, depositsPaidCents: o.depositCents, dealType: o.dealType }); } catch { return null; }
  };
  return (
    <Page title="Deals">
      <FilterTabs base="/dashboard/platform/deals" current={status} options={[['', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['accepted', 'Accepted'], ['contracted', 'Contracted'], ['declined', 'Declined'], ['superseded', 'Superseded'], ['settled', 'Settled']].map(([value, label]) => ({ value, label }))} />
      <form method="get" action="/dashboard/platform/deals" className="flex flex-wrap items-end gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="min-w-0"><Label htmlFor="deal-sales" className="mb-1.5 block">Projected ticket sales ($)</Label><Input id="deal-sales" name="sales" inputMode="decimal" defaultValue={(projected / 100).toFixed(2)} className="h-11 w-44 text-base md:h-9 md:text-sm" /></div>
        <Button type="submit" variant="outline" className="h-11 md:h-9">Update</Button>
      </form>
      <p className="text-sm text-muted-foreground">Each deal below shows what the artist and the promoter would make on {money(projected)} of ticket sales.</p>
      <Rows empty="No deals.">
        {data.offers.map((o: any) => { const p = preview(o); return <Row key={o.id} title={<Link href={`/dashboard/platform/events/${o.event.id}?tab=billing`} className="hover:underline">{o.event.title.toLowerCase().includes(o.artist.name.toLowerCase().replace(/^the /, '')) ? o.event.title : `${o.artist.name}: ${o.event.title}`}</Link>} status={o.status} meta={<div className="space-y-2"><div>{`${label(o.dealType)} · guarantee ${money(o.guaranteeCents)} · ${o.percentageBps / 100}%`}</div><OfferActions offerId={o.id} status={o.status} /></div>} right={p ? <>Artist {money(p.artistTotalCents)} · <span className={p.promoterNetCents < 0 ? 'font-medium text-destructive' : ''}>{p.promoterNetCents < 0 ? 'Promoter loss' : 'Promoter net'} {money(Math.abs(p.promoterNetCents))}</span></> : null} />; })}
      </Rows>
    </Page>
  );
}
