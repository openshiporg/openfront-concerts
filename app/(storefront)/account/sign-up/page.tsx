import { redirect } from 'next/navigation';
import { SignUpForm } from '@/features/storefront/screens/account/AuthForms';
import { currentCustomer } from '@/features/storefront/lib/session';
export const metadata = { title: 'Create an account' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentCustomer()) redirect('/account');
  const { next } = await searchParams;
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Create an account</h1>
      <p className="mb-6 mt-2 max-w-md text-black/70">Keep every ticket in one place and open them on any device.</p>
      <SignUpForm next={next} />
    </main>
  );
}
