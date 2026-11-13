import { requireAnyPermission } from '../../lib/guard';
import { notFound } from 'next/navigation';
import { gql } from '../../lib/gql';
import { money } from '../../lib/format';
import { Page, Row, Rows, StatusLabel } from '../../components/ui-bits';
import { SettlementActions } from '../components/SettlementActions';

const WORKSHEET: [string, string][] = [['Gross tickets', 'ticketGrossCents'], ['Pass-through fees', 'ticketFeesCents'], ['Tax', 'taxCents'], ['Net box office', 'netBoxOfficeCents'], ['Counted expenses', 'totalExpensesCents'], ['Breakeven', 'breakevenCents'], ['Split base', 'splitPointCents'], ['Artist guarantee', 'artistGuaranteeCents'], ['Artist overage', 'artistOverageCents'], ['Artist total', 'artistTotalCents'], ['Venue merch share', 'merchVenueShareCents'], ['Deposits paid', 'depositsPaidCents'], ['Balance due to artist', 'balanceDueArtistCents'], ['Promoter net', 'promoterNetCents']];

export async function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission('canManageSettlements');
  const { id } = await params;
  const data = await gql(`query($id: ID!) { settlement(where: { id: $id }) { id version status hash event { id title } ${WORKSHEET.map(([, k]) => k).join(' ')} paidCount compCount settlementLine_settlement(orderBy: [{ createdAt: asc }]) { id kind label amountCents roundingRemainder } artistPayment_settlement { id kind amountCents status reference } } }`, { id });
  const s = data.settlement; if (!s) notFound();
  return (
    <Page title={`${s.event?.title} · version ${s.version}`} action={<SettlementActions settlementId={s.id} eventId={s.event.id} status={s.status} />}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><StatusLabel status={s.status} /><span className="font-mono text-xs">Hash {String(s.hash).slice(0, 12)}</span><span>{s.paidCount} paid · {s.compCount} comp</span></div>
      <div className="divide-y rounded-lg border">
        {WORKSHEET.map(([name, key]) => <div key={key} className="flex items-center justify-between gap-4 p-3 text-sm"><span>{name}</span><span className="font-medium tabular-nums">{money(s[key])}</span></div>)}
      </div>
      <h2 className="text-sm font-medium">Lines</h2>
      <Rows empty="No lines.">{s.settlementLine_settlement.map((l: any) => <Row key={l.id} title={l.label} meta={l.kind.replace(/_/g, ' ')} right={l.roundingRemainder ? `remainder ${l.roundingRemainder}/10000` : money(l.amountCents)} />)}</Rows>
      <h2 className="text-sm font-medium">Artist payments</h2>
      <Rows empty="No payments recorded.">{s.artistPayment_settlement.map((p: any) => <Row key={p.id} title={`${p.kind} ${p.reference}`} status={p.status} right={money(p.amountCents)} />)}</Rows>
    </Page>
  );
}
