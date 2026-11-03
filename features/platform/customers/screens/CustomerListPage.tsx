import { gql } from '../../lib/gql';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function CustomerListPage() {
  const data = await gql(`{ users(orderBy: [{ name: asc }], take: 200) { id name email role { name } } roles(orderBy: [{ name: asc }]) { id name assignedTo { id } } }`);
  return (
    <Page title="Customers and staff">
      <Rows empty="No users.">{data.users.map((u: any) => <Row key={u.id} title={u.name} meta={u.email} right={u.role?.name || 'Customer'} />)}</Rows>
      <h2 className="text-sm font-medium">Roles</h2>
      <Rows empty="No roles.">{data.roles.map((r: any) => <Row key={r.id} href={`/dashboard/roles/${r.id}`} title={r.name} right={`${r.assignedTo.length} assigned`} />)}</Rows>
    </Page>
  );
}
