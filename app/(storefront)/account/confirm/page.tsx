import Link from 'next/link';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { btn } from '@/features/storefront/lib/ui';
export const metadata = { title: 'Confirm email' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ u?: string; p?: string }> }) {
  const { u, p } = await searchParams;
  const r = u && p ? await keystoneClient<any>('mutation($u: ID!, $p: String!) { confirmCustomerEmail(userId: $u, proof: $p) }', { u, p }) : null;
  const ok = r?.success && r.data?.confirmCustomerEmail?.confirmed;
  const orders = ok ? r.data.confirmCustomerEmail.orders : 0;
  return (
    <main className="max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{ok ? 'Email confirmed' : 'This link did not work'}</h1>
      <p className="mt-2 text-black/70">{ok ? (orders ? `${orders === 1 ? 'One order' : `${orders} orders`} bought with this address now show in your account.` : 'Tickets you buy with this address show in your account.') : 'The link is not valid or has expired. Sign in and send a new one from your account.'}</p>
      <Link href="/account" className={`${btn} mt-6`}>{ok ? 'See my tickets' : 'Go to my account'}</Link>
    </main>
  );
}
