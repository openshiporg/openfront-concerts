import { notFound } from 'next/navigation';
import { gql } from './gql';

/** A page for staff holding at least one of these permissions; everyone else gets the 404 a missing page gets. */
export async function requireAnyPermission(...needed: string[]) {
  const data = await gql<{ authenticatedItem?: { role?: Record<string, unknown> | null } | null }>(`{ authenticatedItem { ... on User { role { ${needed.join(' ')} } } } }`);
  const role = data.authenticatedItem?.role;
  if (!role || !needed.some((p) => role[p] === true)) notFound();
}
