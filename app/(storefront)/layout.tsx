import Link from 'next/link';
import type { Metadata } from 'next';
import { StoreLogoMark } from '@/features/storefront/components/StoreLogoMark';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const r = await keystoneClient<{ storeLogo: { name: string } }>('{ storeLogo { name } }');
  const name = (r.success && r.data.storeLogo?.name) || 'Shows';
  return { title: { default: name, template: `%s · ${name}` } };
}

const nav = 'inline-flex min-h-11 items-center hover:underline underline-offset-4';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f2f2f2] text-[#141414] [font-variant-numeric:tabular-nums]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-6 py-4">
          <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight"><StoreLogoMark withName /></Link>
          <nav aria-label="Main" className="flex items-center gap-x-6 text-sm font-medium">
            <Link href="/" className={nav}>Shows</Link>
            <Link href="/#venues" className={nav}>Venues</Link>
            <Link href="/lookup" className={nav}>Find my order</Link>
          </nav>
        </header>
        <div className="flex-1 pb-16 pt-6 md:pt-10">{children}</div>
        <footer className="flex items-center gap-2 border-t border-black/10 py-6 text-sm text-black/70"><StoreLogoMark withName /></footer>
      </div>
    </div>
  );
}
