import { AccountPage } from '@/features/storefront/screens/account/AccountPage';
export const metadata = { title: 'My tickets' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  return <AccountPage welcome={(await searchParams).welcome === '1'} />;
}
