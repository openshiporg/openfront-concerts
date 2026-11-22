import { redirect } from 'next/navigation';
import { SignInForm } from '@/features/storefront/screens/account/AuthForms';
import { currentCustomer } from '@/features/storefront/lib/session';
export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentCustomer()) redirect('/account');
  const { next } = await searchParams;
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Sign in</h1>
      <p className="mb-6 mt-2 max-w-md text-black/70">See all your tickets in one place. You can still buy without an account.</p>
      <SignInForm next={next} />
    </main>
  );
}
