import Link from 'next/link';
import { redirect } from 'next/navigation';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { currentCustomer } from '../../lib/session';
import { usd, day, clock, words } from '../../lib/format';
import { btn, btnQuiet, link } from '../../lib/ui';
import { customerSignOut } from '../../actions/account';
import { ConfirmEmailButton, ProfileForm } from './AuthForms';

export async function AccountPage({ welcome }: { welcome?: boolean }) {
  const me = await currentCustomer();
  if (!me) redirect('/account/sign-in');
  const r = await keystoneClient<any>('{ myTicketOrders }');
  const orders: any[] = r.success ? r.data.myTicketOrders || [] : [];
  const now = Date.now();
  const upcoming = orders.filter((o) => o.event?.showAt && new Date(o.event.showAt).getTime() > now - 6 * 3600e3 && o.ticketCount > 0);
  const past = orders.filter((o) => !upcoming.includes(o));
  const list = (rows: any[]) => (
    <ul className="mt-3 divide-y divide-black/10 border-y border-black/10">{rows.map((o) => { const tz = o.event?.venue?.timezone; return (
      <li key={o.id}>
        <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4 hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-[#141414]">
          <div className="min-w-0">
            <p className="font-semibold">{o.event?.title || 'Order'}</p>
            <p className="text-sm text-black/70">{[o.event?.showAt ? `${day(o.event.showAt, tz)} · ${clock(o.event.showAt, tz)}` : '', o.event?.venue?.name].filter(Boolean).join(' · ')}</p>
            <p className="text-sm text-black/70">{o.orderNumber} · {o.ticketCount === 1 ? '1 ticket' : `${o.ticketCount} tickets`}{o.status !== 'paid' ? ` · ${words(o.status)}` : ''}</p>
          </div>
          <span className="text-sm font-semibold">{usd(o.totalCents, o.currencyCode)}</span>
        </Link>
      </li>); })}</ul>
  );
  return (
    <main className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My tickets</h1>
      <p className="mt-2 text-black/70">Signed in as {me.name} · {me.email}</p>
      {welcome ? <p role="status" className="mt-4 border-l-2 border-black pl-3">Your account is ready.{me.emailVerifiedAt ? '' : ' We emailed you a link to confirm your address.'}</p> : null}
      {!me.emailVerifiedAt ? <section className="mt-6 rounded-lg border border-black/15 bg-white p-4">
        <h2 className="font-semibold">Confirm your email</h2>
        <p className="mt-1 text-sm text-black/70">Open the link we sent to {me.email}. Tickets you bought with this address as a guest then show up here.</p>
        <div className="mt-3"><ConfirmEmailButton /></div>
      </section> : null}

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Upcoming</h2>
        {upcoming.length ? list(upcoming) : <div className="mt-3"><p className="text-black/70">No upcoming shows on this account.</p><Link href="/" className={`${btn} mt-4`}>See shows</Link></div>}
      </section>
      {past.length ? <section className="mt-10"><h2 className="text-xl font-semibold tracking-tight">Past and refunded</h2>{list(past)}</section> : null}

      <section className="mt-10 border-t border-black/10 pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Account</h2>
        <div className="mt-4"><ProfileForm name={me.name} /></div>
        <p className="mt-6 text-sm"><Link className={link} href="/account/reset">Change your password</Link></p>
        {me.staff ? <p className="mt-2 text-sm"><Link className={link} href="/dashboard">Open the dashboard</Link></p> : null}
        <form action={customerSignOut} className="mt-6"><button className={btnQuiet}>Sign out</button></form>
      </section>
    </main>
  );
}
