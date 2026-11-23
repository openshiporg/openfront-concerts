import Link from 'next/link';
import { gql } from '../../lib/gql';
import { roleFlags } from '../../lib/guard';
import { Page, Row, Rows } from '../../components/ui-bits';
import { money, when } from '../../lib/format';
import { isVenueToday } from '../lib/today';

export async function OperationsHome() {
  const can = await roleFlags('canManageEvents', 'canManageOrders', 'canIssueRefunds', 'canScanTickets', 'canManageSettlements', 'canManageDeals');
  const sales = can.canManageOrders || can.canIssueRefunds;
  const clock = new Date();
  const now = clock.toISOString();
  // A 48-hour candidate window includes every venue's current local date. Filter
  // precisely by venue below so stale status never makes an old show look live.
  const from = new Date(clock.getTime() - 48 * 3600_000).toISOString();
  const until = new Date(clock.getTime() + 48 * 3600_000).toISOString();
  const data = await gql(`query($now: DateTime!, $from: DateTime!, $until: DateTime!) {
    live: events(where: { showAt: { gte: $from, lte: $until }, status: { in: ["doors", "in_progress"] } }, take: 100, orderBy: [{ showAt: asc }]) { id title status showAt venue { name timezone } }
    upcoming: events(where: { showAt: { gte: $now }, status: { in: ["announced", "presale", "on_sale", "sold_out"] } }, take: 8, orderBy: [{ showAt: asc }]) { id title status showAt venue { name timezone } }
    ${sales ? 'ticketOrders(take: 5, where: { status: { in: ["paid", "partially_refunded", "comp"] } }, orderBy: [{ createdAt: desc }]) { id orderNumber status totalCents currencyCode guestName event { title } } cashDrawers(where: { status: { equals: "open" } }, take: 10, orderBy: [{ openedAt: desc }]) { id label openedAt openedBy { name } }' : ''}
    ${can.canManageSettlements ? 'settlements(where: { status: { in: ["draft", "reviewed", "signed_promoter", "signed_artist"] } }, take: 5, orderBy: [{ createdAt: desc }]) { id status event { title } }' : ''}
  }`, { now, from, until });
  const live = data.live.filter((e: { showAt?: string; venue?: { timezone?: string } }) => isVenueToday(e.showAt, e.venue?.timezone, clock));
  const shortcuts = [
    { name: 'Box office', href: 'box-office', show: sales },
    { name: 'Find an order', href: 'orders', show: sales },
    { name: 'Door scan', href: 'door', show: can.canScanTickets },
    { name: 'Events', href: 'events', show: true },
    { name: 'Calendar', href: 'calendar', show: can.canManageEvents || can.canManageDeals },
    { name: 'Settlements', href: 'settlements', show: can.canManageSettlements },
  ];
  const shows = (rows: any[]) => rows.map((e) => <Row key={e.id} href={can.canScanTickets && ['doors', 'in_progress'].includes(e.status) ? `/dashboard/platform/door?event=${e.id}` : `/dashboard/platform/events/${e.id}`} title={e.title} status={e.status} meta={`${when(e.showAt, e.venue?.timezone || undefined)} · ${e.venue?.name || ''}`} />);
  return <Page title="Operations">
    <nav aria-label="Quick actions" className="flex flex-wrap gap-2">{shortcuts.filter((s) => s.show).map((s) => <Link key={s.href} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted" href={`/dashboard/platform/${s.href}`}>{s.name}</Link>)}</nav>
    {live.length ? <section className="space-y-2"><h2 className="font-medium">At the door today</h2><Rows>{shows(live)}</Rows></section> : null}
    <section className="space-y-2"><h2 className="font-medium">Next shows</h2><Rows empty="No upcoming shows are on sale or announced.">{shows(data.upcoming)}</Rows></section>
    {sales ? <div className="grid gap-5 lg:grid-cols-2"><section className="space-y-2"><h2 className="font-medium">Latest orders</h2><Rows empty="No paid orders yet.">{data.ticketOrders.map((o: any) => <Row key={o.id} href={`/dashboard/platform/orders/${o.id}`} title={o.orderNumber} status={o.status} meta={`${o.guestName} · ${o.event?.title || ''}`} right={money(o.totalCents, o.currencyCode)} />)}</Rows></section><section className="space-y-2"><h2 className="font-medium">Open cash drawers</h2><Rows empty="No cash drawers are open.">{data.cashDrawers.map((d: any) => <Row key={d.id} href="/dashboard/platform/box-office" title={d.label} meta={`${d.openedBy?.name || ''} · opened ${when(d.openedAt)}`} />)}</Rows></section></div> : null}
    {can.canManageSettlements ? <section className="space-y-2"><h2 className="font-medium">Settlements to finish</h2><Rows empty="No settlements awaiting sign-off.">{data.settlements.map((s: any) => <Row key={s.id} href={`/dashboard/platform/settlements/${s.id}`} title={s.event?.title} status={s.status} />)}</Rows></section> : null}
  </Page>;
}
