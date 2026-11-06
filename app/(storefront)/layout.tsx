import Link from 'next/link';
import { StoreLogoMark } from '@/features/storefront/components/StoreLogoMark';

export const dynamic = 'force-dynamic';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <Link href="/" className="flex w-fit items-center gap-2 text-lg font-semibold"><StoreLogoMark />Tickets</Link>
      </div>
      {children}
    </>
  );
}
