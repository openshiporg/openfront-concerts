import Link from 'next/link';
import { StoreLogoMark } from '@/features/storefront/components/StoreLogoMark';

export const dynamic = 'force-dynamic';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f2f2f2] text-[#141414]">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-3 sm:px-4">
        <header className="flex items-center justify-between rounded-3xl bg-[#f7f7f7] px-4 py-2.5 shadow-sm">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold leading-tight"><StoreLogoMark withName /></Link>
          <nav className="flex items-center gap-4 text-sm font-medium sm:gap-6">
            <Link href="/#events" className="hidden min-h-11 items-center sm:flex">Events</Link>
            <Link href="/lookup" className="flex min-h-11 items-center">My order</Link>
            <Link href="/#events" className="flex min-h-11 items-center rounded-full bg-[#141414] px-4 text-white">Tickets</Link>
          </nav>
        </header>
        {children}
        <footer className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#f7f7f7] p-6 text-sm">
          <Link href="/" className="flex items-center gap-2 font-semibold"><StoreLogoMark withName /></Link>
          <div className="flex gap-10 text-xs">
            <div className="space-y-2"><div className="text-sm font-semibold">Events</div><Link className="block opacity-70" href="/#events">Upcoming shows</Link></div>
            <div className="space-y-2"><div className="text-sm font-semibold">Orders</div><Link className="block opacity-70" href="/lookup">Find my order</Link></div>
          </div>
        </footer>
      </div>
    </div>
  );
}
