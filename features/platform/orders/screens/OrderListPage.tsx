import { gql } from '../../lib/gql';
import { money, when } from '../../lib/format';
import { FilterTabs, Page, Row, Rows } from '../../components/ui-bits';

export async function OrderListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const data = await gql(`query($where: TicketOrderWhereInput!) { ticketOrders(where: $where, orderBy: [{ createdAt: desc }], take: 100) { id orderNumber status totalCents guestName createdAt event { title } } }`, { where: status ? { status: { equals: status } } : {} });
  return (
    <Page title="Orders">
      <FilterTabs base="/dashboard/platform/orders" current={status} options={[['', 'All'], ['paid', 'Paid'], ['pending_payment', 'Pending'], ['partially_refunded', 'Part refunded'], ['refunded', 'Refunded']].map(([value, label]) => ({ value, label }))} />
      <Rows empty="No orders.">{data.ticketOrders.map((o: any) => <Row key={o.id} title={o.orderNumber} status={o.status} meta={`${o.event?.title} · ${o.guestName} · ${when(o.createdAt)}`} right={money(o.totalCents)} />)}</Rows>
    </Page>
  );
}
