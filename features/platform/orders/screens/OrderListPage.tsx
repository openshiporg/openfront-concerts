import Link from 'next/link';
import { requireAnyPermission } from '../../lib/guard';
import { gql } from '../../lib/gql';
import { money, when } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';
import { OrderSearch } from '../../box-office/components/BoxOfficeTools';

const statuses = [['', 'All'], ['paid', 'Paid'], ['pending_payment', 'Pending'], ['comp', 'Guest list'], ['partially_refunded', 'Part refunded'], ['refunded', 'Refunded']];

export async function OrderListPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireAnyPermission('canManageOrders', 'canIssueRefunds');
  const params = await searchParams;
  const status = statuses.some(([s]) => s === params.status) ? params.status || '' : '';
  const q = (params.q || '').trim().slice(0, 200);
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.page)) || 1));
  const where = { ...(status ? { status: { equals: status } } : {}), ...(q ? { OR: [{ orderNumber: { contains: q, mode: 'insensitive' } }, { guestEmail: { contains: q, mode: 'insensitive' } }, { guestName: { contains: q, mode: 'insensitive' } }] } : {}) };
  const data = await gql(`query($where: TicketOrderWhereInput!, $skip: Int!) { ticketOrders(where: $where, orderBy: [{ createdAt: desc }, { id: desc }], take: 21, skip: $skip) { id orderNumber status totalCents currencyCode guestName createdAt event { title } } }`, { where, skip: (page - 1) * 20 });
  const href = (s: string, p = 1) => { const v = new URLSearchParams(); if (s) v.set('status', s); if (q) v.set('q', q); if (p > 1) v.set('page', String(p)); return `/dashboard/platform/orders?${v}`; };
  const orders = data.ticketOrders.slice(0, 20);
  return (
    <Page title="Orders">
      <OrderSearch initial={q} base="/dashboard/platform/orders" status={status} />
      <nav aria-label="Order status" className="flex flex-wrap gap-1">{statuses.map(([value, title]) => <Link key={value} href={href(value)} aria-current={status === value ? 'page' : undefined} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground">{title}</Link>)}</nav>
      <Rows empty={q ? 'No orders match your search.' : 'No orders in this view.'}>{orders.map((o: any) => <Row key={o.id} href={`/dashboard/platform/orders/${o.id}`} title={o.orderNumber} status={o.status} meta={`${o.event?.title || 'Show unavailable'} · ${o.guestName} · ${when(o.createdAt)}`} right={money(o.totalCents, o.currencyCode)} />)}</Rows>
      <nav aria-label="Order pages" className="flex items-center justify-between gap-3 text-sm">
        <span>Page {page} · {orders.length} orders</span>
        <div className="flex gap-3">{page > 1 ? <Link href={href(status, page - 1)} className="inline-flex min-h-11 items-center underline">Previous</Link> : null}{data.ticketOrders.length > 20 ? <Link href={href(status, page + 1)} className="inline-flex min-h-11 items-center underline">Next 20</Link> : null}</div>
      </nav>
    </Page>
  );
}
