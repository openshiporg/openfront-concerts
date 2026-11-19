'use client';

/** Browser GraphQL call to the custom storefront operations; never raw list CRUD. */
export async function api<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/graphql', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data;
}
