import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export type Customer = { id: string; name: string; email: string; emailVerifiedAt: string | null; staff: boolean };

/** The signed-in person, if any (customer or staff). */
export async function currentCustomer(): Promise<Customer | null> {
  const r = await keystoneClient<any>(`{ authenticatedItem { ... on User { id name email emailVerifiedAt role { canAccessDashboard } } } }`);
  const u = r.success ? r.data?.authenticatedItem : null;
  return u?.id ? { id: u.id, name: u.name, email: u.email, emailVerifiedAt: u.emailVerifiedAt || null, staff: Boolean(u.role?.canAccessDashboard) } : null;
}

export async function storeContact(): Promise<{ name: string; supportEmail: string; supportPhone: string; refundPolicy: string }> {
  const r = await keystoneClient<any>(`{ storeLogo { name supportEmail supportPhone refundPolicy } }`);
  const s = r.success ? r.data?.storeLogo : null;
  return { name: s?.name || 'Concerts', supportEmail: s?.supportEmail || '', supportPhone: s?.supportPhone || '', refundPolicy: s?.refundPolicy || '' };
}
