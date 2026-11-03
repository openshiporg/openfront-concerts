'use client';

/** Browser-side custom GraphQL command. Every call carries a fresh idempotency key. */
export async function runCommand(name: string, input: Record<string, unknown>): Promise<any> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Run($input: OperatorCommandInput!) { result: ${name}(input: $input) }`,
      variables: { input: { ...input, idempotencyKey: crypto.randomUUID() } },
    }),
  });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data.result;
}
