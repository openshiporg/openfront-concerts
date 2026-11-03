import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

/** Server-side GraphQL read through the signed-in session; throws so screens never render empty on auth failure. */
export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await keystoneClient<T>(query, variables);
  if (!response.success) throw new Error(response.error || 'Request failed');
  return response.data as T;
}
