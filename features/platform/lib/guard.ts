import { notFound } from 'next/navigation';
import { gql } from './gql';

/** A page for staff holding at least one of these permissions; everyone else gets the 404 a missing page gets. */
export async function requireAnyPermission(...needed: string[]) {
  const data = await gql<{ authenticatedItem?: { role?: Record<string, unknown> | null } | null }>(`{ authenticatedItem { ... on User { role { ${needed.join(' ')} } } } }`);
  const role = data.authenticatedItem?.role;
  if (!role || !needed.some((p) => role[p] === true)) notFound();
}

/** The signed-in role's flags, so a page offers only the actions the same command would accept. */
export async function roleFlags(...names: string[]): Promise<Record<string, boolean>> {
  const data = await gql<{ authenticatedItem?: { role?: Record<string, unknown> | null } | null }>(`{ authenticatedItem { ... on User { role { ${names.join(' ')} } } } }`);
  const role = data.authenticatedItem?.role || {};
  return Object.fromEntries(names.map((n) => [n, role[n] === true]));
}
