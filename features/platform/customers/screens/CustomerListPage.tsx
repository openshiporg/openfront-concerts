import Link from 'next/link';
import { requireAnyPermission } from '../../lib/guard';
import { gql } from '../../lib/gql';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function CustomerListPage() {
  await requireAnyPermission('canSeeOtherPeople', 'canManagePeople', 'canManageRoles');
  const data = await gql(`{ users(orderBy: [{ name: asc }], take: 200) { id name email role { name } } ticketOrders(where: { status: { in: ["paid", "partially_refunded", "refunded", "comp"] } }, orderBy: [{ createdAt: desc }], take: 200) { id guestName guestEmail orderNumber } }`);
  const customers = new Map<string, { name: string; email: string; account: boolean; order?: string }>();
  for (const u of data.users) if (!u.role) customers.set(u.email.toLowerCase(), { name: u.name, email: u.email, account: true });
  for (const o of data.ticketOrders) if (o.guestEmail) {
    const email = o.guestEmail.toLowerCase();
    const existing = customers.get(email);
    if (!existing) customers.set(email, { name: o.guestName, email, account: false, order: o.orderNumber });
    else if (!existing.order) existing.order = o.orderNumber;
  }
  return <Page title="Customers and staff">
    <section className="space-y-2"><h2 className="font-medium">Customers</h2><Rows empty="No customers yet.">{[...customers.values()].map((c) => <Row key={c.email} title={c.name || c.email} meta={<span className="break-all">{c.email}</span>} right={<>{c.account ? 'Account' : 'Guest'}{c.order ? <Link className="ml-3 inline-flex min-h-11 items-center underline" href={`/dashboard/platform/orders?q=${encodeURIComponent(c.email)}`}>Orders</Link> : null}</>} />)}</Rows><p className="text-sm text-muted-foreground">Accounts and buyers from the 200 most recent paid or refunded orders. Find older buyers in Orders.</p></section>
    <section className="space-y-2"><h2 className="font-medium">Staff</h2><Rows empty="No staff.">{data.users.filter((u: any) => u.role).map((u: any) => <Row key={u.id} title={u.name} meta={u.email} right={u.role.name} />)}</Rows></section>
  </Page>;
}
