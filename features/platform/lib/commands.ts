'use client';

async function post(query: string, variables: Record<string, unknown>) {
  const response = await fetch('/api/graphql', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data.result;
}

/** Browser-side custom GraphQL command. Every call carries a fresh idempotency key. */
export async function runCommand(name: string, input: Record<string, unknown>): Promise<any> {
  return post(`mutation Run($input: OperatorCommandInput!) { result: ${name}(input: $input) }`, { input: { ...input, idempotencyKey: crypto.randomUUID() } });
}

/** Commands with their own typed input (refunds and approvals). Pass a stable key to make a retry replay, not repeat. */
export async function runTyped(name: string, inputType: string, input: Record<string, unknown>): Promise<any> {
  return post(`mutation Run($input: ${inputType}!) { result: ${name}(input: $input) }`, { input });
}
