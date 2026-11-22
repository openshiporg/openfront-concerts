import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gql } from '../../lib/gql';
import { requireAnyPermission, roleFlags } from '../../lib/guard';
import { money, when, label } from '../../lib/format';
import { Page, Row, Rows, Stat, StatusLabel } from '../../components/ui-bits';
import { RefundPanel, RetryRefund } from '../../box-office/components/RefundPanel';
import { ResendConfirmation } from '../components/ResendConfirmation';

export async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission('canManageOrders', 'canIssueRefunds');
  const { id } = await params;
  const [data, can] = await Promise.all([
    gql(`query($id: ID!, $target: String!) {
      ticketOrder(where: { id: $id }) { id orderNumber status source guestName guestEmail createdAt totalCents subtotalCents serviceFeesCents facilityFeesCents taxCents discountCents refundedCents currencyCode confirmationSentAt
        event { id title showAt venue { name timezone } }
        ticketOrderLine_order(take: 200) { id title levelName phaseName seatLabel quantity totalCents }
        ticket_order(take: 200) { id ticketCode status holderName holderEmail line { seatLabel levelName } }
      }
      refunds(where: { order: { id: { equals: $id } } }, take: 50, orderBy: [{ createdAt: desc }]) { id status amount currencyCode reason createdAt }
      managerApprovals(where: { targetId: { equals: $target }, status: { in: ["pending", "approved"] } }, take: 50) { id actionType targetId amount reason status }
      storeSettingsRecords(take: 1) { refundApprovalThresholdCents }
    }`, { id, target: id }),
    roleFlags('canIssueRefunds', 'canReadPayments', 'canManagePayments'),
  ]);
  const o = data.ticketOrder;
  if (!o) notFound();
  // Refund commands validate the captured payment themselves. Do not require read-payment access:
  // box-office staff can issue refunds without being allowed to read provider payloads.
  const refundable = ['paid', 'partially_refunded'].includes(o.status) ? o.totalCents - o.refundedCents : 0;
  const totals = [['Tickets', o.subtotalCents], ['Service fees', o.serviceFeesCents], ['Facility fees', o.facilityFeesCents], ['Tax', o.taxCents], ['Discount', -o.discountCents]].filter(([, amount]) => Number(amount) !== 0);
  return <Page title={o.orderNumber} crumbs={[{ label: 'Orders', href: '/platform/orders' }]}>
    <div className="flex flex-wrap items-center gap-3"><StatusLabel status={o.status} /><span className="text-sm text-muted-foreground">{label(o.source)} · {when(o.createdAt)}</span></div>
    <section className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1 rounded-lg border p-4"><h2 className="text-sm font-medium text-muted-foreground">Customer</h2><p className="font-medium">{o.guestName || 'No name supplied'}</p>{o.guestEmail ? <a href={`mailto:${o.guestEmail}`} className="inline-flex min-h-11 max-w-full items-center break-all text-sm underline">{o.guestEmail}</a> : <p className="text-sm text-muted-foreground">No email supplied</p>}</div>
      <div className="space-y-1 rounded-lg border p-4"><h2 className="text-sm font-medium text-muted-foreground">Show</h2>{o.event ? <><Link className="inline-flex min-h-11 items-center font-medium underline" href={`/dashboard/platform/events/${o.event.id}`}>{o.event.title}</Link><p className="text-sm text-muted-foreground">{when(o.event.showAt, o.event.venue?.timezone || undefined)} · {o.event.venue?.name}</p></> : <p>Show unavailable</p>}</div>
    </section>
    <div className="grid grid-cols-2 gap-3"><Stat name="Order total" value={money(o.totalCents, o.currencyCode)} /><Stat name="Refunded" value={money(o.refundedCents, o.currencyCode)} /></div>
    <section className="space-y-2"><h2 className="font-medium">Tickets</h2><Rows empty="No tickets issued.">{o.ticket_order.map((t: any) => <Row key={t.id} title={t.ticketCode} status={t.status} meta={<span className="break-words">{[t.holderName, t.holderEmail, t.line?.levelName, t.line?.seatLabel].filter(Boolean).join(' · ')}</span>} />)}</Rows>{o.ticket_order.length === 200 ? <p className="text-sm text-muted-foreground">Showing the first 200 tickets.</p> : null}</section>
    <section className="max-w-xl space-y-2"><h2 className="font-medium">Receipt</h2><dl className="divide-y rounded-lg border px-4">{totals.map(([title, amount]) => <div key={title} className="flex justify-between gap-4 py-3 text-sm"><dt>{title}</dt><dd>{money(Number(amount), o.currencyCode)}</dd></div>)}<div className="flex justify-between gap-4 py-3 font-medium"><dt>Total</dt><dd>{money(o.totalCents, o.currencyCode)}</dd></div></dl></section>
    {o.guestEmail && ['paid', 'partially_refunded', 'comp'].includes(o.status) ? <section className="space-y-2"><h2 className="font-medium">Ticket email</h2><p className="break-all text-sm text-muted-foreground">To {o.guestEmail}{o.confirmationSentAt ? ` · last sent ${when(o.confirmationSentAt)}` : ' · not sent yet'}</p><ResendConfirmation orderId={o.id} /></section> : null}
    {can.canIssueRefunds && refundable > 0 ? <section className="space-y-2"><h2 className="font-medium">Refund</h2><p className="text-sm text-muted-foreground">{money(refundable, o.currencyCode)} can be refunded.</p><RefundPanel orderId={o.id} cash={o.source === 'box_office'} refundableCents={refundable} thresholdCents={data.storeSettingsRecords[0]?.refundApprovalThresholdCents ?? 0} approvals={data.managerApprovals} /></section> : null}
    {!can.canReadPayments && !can.canManagePayments && o.refundedCents > 0 ? <p className="text-sm text-muted-foreground">Your role can see the refunded total. Payment staff can view the individual refund records.</p> : null}
    {data.refunds.length ? <section className="space-y-2"><h2 className="font-medium">Refund history</h2><Rows>{data.refunds.map((r: any) => <Row key={r.id} title={money(r.amount, r.currencyCode)} status={r.status} meta={`${r.reason} · ${when(r.createdAt)}`} right={can.canIssueRefunds && ['processing', 'unknown'].includes(r.status) ? <RetryRefund refundId={r.id} label="" /> : null} />)}</Rows></section> : null}
  </Page>;
}
