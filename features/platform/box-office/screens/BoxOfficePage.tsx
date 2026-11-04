import Link from 'next/link';
import { gql } from '../../lib/gql';
import { money, when } from '../../lib/format';
import { OrderSearch } from '../components/BoxOfficeTools';
import { RefundPanel } from '../components/RefundPanel';
import { ApprovalActions } from '../components/ApprovalActions';
import { DoorSalePanel } from '../components/DoorSalePanel';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function BoxOfficePage({ searchParams }: { searchParams: Promise<{ q?: string; take?: string }> }) {
  const { q, take: takeParam } = await searchParams;
  const take = Math.min(200, Math.max(20, Math.floor(Number(takeParam)) || 20));
  const where = q ? { OR: [{ orderNumber: { contains: q.toUpperCase() } }, { guestEmail: { contains: q.toLowerCase() } }, { guestName: { contains: q, mode: 'insensitive' } }] } : {};
  const data = await gql(`query($where: TicketOrderWhereInput!, $take: Int!) {
    ticketOrders(where: $where, orderBy: [{ createdAt: desc }], take: $take) { id orderNumber status totalCents refundedCents guestName guestEmail createdAt event { title } ticket_order { id ticketCode status } payments(where: { status: { in: ["succeeded", "partially_refunded"] } }) { id providerPaymentId } }
    events(where: { status: { in: ["presale", "on_sale", "doors", "in_progress"] } }, orderBy: [{ showAt: asc }], take: 20) { id title priceLevel_event(where: { status: { equals: "active" } }) { id name priceCents capacity sold held productionHeld sections { kind } } }
    storeSettingsRecords(take: 1) { refundApprovalThresholdCents }
    managerApprovals(where: { status: { in: ["pending", "approved"] }, expiresAt: { gt: "${new Date().toISOString()}" } }, orderBy: [{ createdAt: desc }], take: 50) { id actionType targetId amount reason status expiresAt requestedBy { id name } }
  }`, { where, take: take + 1 }).catch(() => null);
  if (!data) return <Page title="Box office"><p className="rounded-lg border p-6 text-sm text-muted-foreground">Box office could not load.</p></Page>;
  const threshold = data.storeSettingsRecords?.[0]?.refundApprovalThresholdCents ?? 0;
  const approvals = data.managerApprovals;
  const levels = (data.events || []).flatMap((e: any) => (e.priceLevel_event || []).filter((l: any) => l.sections?.length && l.sections.every((s: any) => s.kind === 'ga')).map((l: any) => ({ id: l.id, name: l.name, priceCents: l.priceCents, room: l.capacity - l.sold - l.held - l.productionHeld, eventId: e.id, eventTitle: e.title }))).filter((l: any) => l.room > 0);
  const hasMore = data.ticketOrders.length > take;
  const orders = data.ticketOrders.slice(0, take);
  const pending = approvals.filter((a: any) => a.status === 'pending');
  return (
    <Page title="Box office">
      <DoorSalePanel levels={levels} />
      <OrderSearch initial={q} />
      {pending.length ? (
        <section className="space-y-2"><h2 className="text-sm font-medium">Refund approvals waiting</h2>
          <Rows>{pending.map((a: any) => <Row key={a.id} title={money(a.amount)} status="pending" meta={`${a.reason} · requested by ${a.requestedBy?.name || 'unknown'}`} right={<ApprovalActions approvalId={a.id} />} />)}</Rows>
        </section>
      ) : null}
      <Rows empty="No orders found.">
        {orders.map((o: any) => {
          const refundable = ['paid', 'partially_refunded'].includes(o.status) && o.payments?.length ? o.totalCents - o.refundedCents : 0;
          return <Row key={o.id} title={o.orderNumber} status={o.status}
            meta={<>{`${o.event?.title} · ${o.guestName} · ${o.guestEmail} · ${when(o.createdAt)}`}<RefundPanel orderId={o.id} cash={Boolean(o.payments?.[0]) && !o.payments[0].providerPaymentId} refundableCents={refundable} thresholdCents={threshold} approvals={approvals.filter((a: any) => a.targetId === o.id).map(({ id, actionType, targetId, amount, reason, status }: any) => ({ id, actionType, targetId, amount, reason, status }))} /></>}
            right={<>{o.ticket_order.length} tickets · {money(o.totalCents)}{o.refundedCents ? ` · refunded ${money(o.refundedCents)}` : ''}</>} />;
        })}
      </Rows>
      <p className="text-sm text-muted-foreground">{q ? 'Matching orders' : 'Most recent orders'}: showing {orders.length}.{hasMore ? <> <Link className="underline" href={`/dashboard/platform/box-office?${q ? `q=${encodeURIComponent(q)}&` : ''}take=${take + 20}`}>Load 20 more</Link></> : null}</p>
    </Page>
  );
}
