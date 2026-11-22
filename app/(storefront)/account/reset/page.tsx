import { ResetForm } from '@/features/storefront/screens/account/AuthForms';
export const metadata = { title: 'Reset password' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token, email } = await searchParams;
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{token ? 'Choose a new password' : 'Reset your password'}</h1>
      <p className="mb-6 mt-2 max-w-md text-black/70">{token ? 'Enter your email and a new password.' : 'We email you a link to choose a new password.'}</p>
      <ResetForm token={token} email={email} />
    </main>
  );
}
