'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';

type Item = { href: string; label: string };

const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414]';

/** Phones: a menu button that opens a full-height panel. Wider screens show the same links inline. */
export function SiteMenu({ items, account, storeName }: { items: Item[]; account: Item; storeName: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname() || "/";
  useEffect(() => { setOpen(false); }, [path]); // eslint-disable-line react-hooks/set-state-in-effect
  const current = (href: string) => (href === '/' ? path === '/' : path.startsWith(href.split('#')[0]) && href !== '/#venues');
  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-x-1 text-sm font-medium md:flex">
        {items.map((i) => <Link key={i.href} href={i.href} aria-current={current(i.href) ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-3 hover:bg-black/5 aria-[current=page]:underline aria-[current=page]:underline-offset-8 ${ring}`}>{i.label}</Link>)}
        <Link href={account.href} aria-current={current(account.href) ? 'page' : undefined} className={`ml-2 inline-flex min-h-11 items-center rounded-lg border border-black/25 bg-white px-4 hover:border-black ${ring}`}>{account.label}</Link>
      </nav>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger aria-label="Open menu" className={`-mr-2 inline-flex size-11 items-center justify-center rounded-lg hover:bg-black/5 md:hidden ${ring}`}>
          <Menu className="size-6" aria-hidden />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(20rem,86vw)] flex-col bg-[#f2f2f2] text-[#141414] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-150 motion-reduce:animate-none">
            <div className="flex h-[4.75rem] shrink-0 items-center justify-between border-b border-black/10 px-5">
              <Dialog.Title className="text-lg font-semibold tracking-tight">{storeName}</Dialog.Title>
              <Dialog.Close aria-label="Close menu" className={`-mr-2 inline-flex size-11 items-center justify-center rounded-lg hover:bg-black/5 ${ring}`}><X className="size-6" aria-hidden /></Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Site menu</Dialog.Description>
            <nav aria-label="Menu" className="flex-1 overflow-y-auto px-3 py-3">
              <ul className="space-y-1">
                {items.map((i) => <li key={i.href}><Link href={i.href} onClick={() => setOpen(false)} aria-current={current(i.href) ? 'page' : undefined} className={`flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-black/5 aria-[current=page]:bg-black/[0.06] ${ring}`}>{i.label}</Link></li>)}
              </ul>
            </nav>
            <div className="border-t border-black/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <Link href={account.href} onClick={() => setOpen(false)} className={`flex min-h-12 w-full items-center justify-center rounded-lg bg-[#141414] text-base font-semibold text-white hover:bg-[#333] ${ring}`}>{account.label}</Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
