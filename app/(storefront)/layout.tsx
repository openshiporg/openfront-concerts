import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { StoreLogoMark } from '@/features/storefront/components/StoreLogoMark';
import { SiteMenu } from '@/features/storefront/components/SiteMenu';
import { currentCustomer, storeContact } from '@/features/storefront/lib/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await storeContact();
  return { title: { default: name, template: `%s · ${name}` }, description: `Tickets for live shows from ${name}.` };
}

// The storefront is one light design; phone controls should match it whatever the system theme.
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f2f2f2' };

const items = [
  { href: '/', label: 'Shows' },
  { href: '/#venues', label: 'Venues' },
  { href: '/lookup', label: 'Find my order' },
];

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [me, store] = await Promise.all([currentCustomer(), storeContact()]);
  const account = me ? { href: '/account', label: 'My tickets' } : { href: '/account/sign-in', label: 'Sign in' };
  return (
    <div className="min-h-screen bg-[#f2f2f2] text-[#141414] [color-scheme:light] [font-variant-numeric:tabular-nums]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">Skip to content</a>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 md:px-8">
        <header className="flex h-[4.75rem] items-center justify-between gap-x-6">
          <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414]"><StoreLogoMark withName /></Link>
          <SiteMenu items={items} account={account} storeName={store.name} />
        </header>
        <div id="main" className="flex-1 pb-16 pt-4 md:pt-8">{children}</div>
        <footer className="border-t border-black/10 py-8 text-sm text-black/70">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold text-[#141414]"><StoreLogoMark withName /></p>
              {store.supportEmail || store.supportPhone ? <p>Questions about an order? {store.supportEmail ? <a className="underline underline-offset-4" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a> : null}{store.supportEmail && store.supportPhone ? ' · ' : ''}{store.supportPhone ? <a className="underline underline-offset-4" href={`tel:${store.supportPhone.replace(/[^+\d]/g, '')}`}>{store.supportPhone}</a> : null}</p> : null}
              {store.refundPolicy ? <p className="max-w-prose">{store.refundPolicy}</p> : null}
            </div>
            <ul className="flex flex-wrap gap-x-5 sm:flex-col sm:items-end">
              <li><Link className="inline-flex min-h-11 items-center hover:underline underline-offset-4" href="/lookup">Find my order</Link></li>
              <li><Link className="inline-flex min-h-11 items-center hover:underline underline-offset-4" href={account.href}>{me ? 'My account' : 'Sign in or create an account'}</Link></li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
