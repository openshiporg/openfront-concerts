import { gql } from '../../lib/gql';
import { money, when } from '../../lib/format';
import { OrderSearch } from '../components/BoxOfficeTools';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function BoxOfficePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const where = q ? { OR: [{ orderNumber: { contains: q.toUpperCase() } }, { guestEmail: { contains: q.toLowerCase() } }, { guestName: { contains: q, mode: 'insensitive' } }] } : {};
  const data = await gql(`query($where: TicketOrderWhereInput!) { ticketOrders(where: $where, orderBy: [{ createdAt: desc }], take: 50) { id orderNumber status totalCents refundedCents guestName guestEmail createdAt event { title } ticket_order { id ticketCode status } } }`, { where });
  return (
    <Page title="Box office">
      <OrderSearch initial={q} />
      <Rows empty="No orders found.">
        {data.ticketOrders.map((o: any) => <Row key={o.id} title={o.orderNumber} status={o.status} meta={`${o.event?.title} · ${o.guestName} · ${o.guestEmail} · ${when(o.createdAt)}`} right={<>{o.ticket_order.length} tickets · {money(o.totalCents)}{o.refundedCents ? ` · refunded ${money(o.refundedCents)}` : ''}</>} />)}
      </Rows>
    </Page>
  );
}
