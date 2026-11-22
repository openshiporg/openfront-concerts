import Link from 'next/link';
import { btn } from '@/features/storefront/lib/ui';

export default function NotFound() {
  return (
    <main className="max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">We could not find that page</h1>
      <p className="mt-2 text-black/70">The show may have ended or the link may be wrong. Looking for tickets you bought? Find them with your order number and email.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className={btn}>See all shows</Link><Link href="/lookup" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline underline-offset-4">Find my order</Link></div>
    </main>
  );
}
