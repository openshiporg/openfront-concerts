import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gql } from '../../lib/gql';
import { money, when, label } from '../../lib/format';
import { EventActions } from '../components/EventActions';
import { Page, Row, Rows, Stat, StatusLabel } from '../../components/ui-bits';
import { cn } from '@/lib/utils';

const TABS = ['overview', 'billing', 'pricing', 'seating', 'orders', 'expenses', 'settlement'];
const SEAT_COLOR: Record<string, string> = { open: 'bg-emerald-500', held: 'bg-amber-500', sold: 'bg-zinc-800 dark:bg-zinc-200', killed: 'bg-red-500', comp: 'bg-sky-500', reserved_hold: 'bg-violet-500' };

export async function EventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params; const { tab = 'overview' } = await searchParams;
  const data = await gql(`query($id: ID!) { event(where: { id: $id }) {
    id title status showAt doorsAt curfewAt ageRestriction onSaleAt description sold held kills open gross venue { name city timezone } seatingChart { name version } tour { name }
    eventArtist_event(orderBy: [{ position: asc }]) { id billing position setMinutes artist { name } }
    offer_event { id status dealType guaranteeCents percentageBps expenseCapCents depositCents artist { name } }
    priceLevel_event { id name priceCents feeCents capacity sold held productionHeld priceLevelPhase_priceLevel(orderBy: [{ sort: asc }]) { id name priceCents quantity sold } }
    eventExpense_event { id category budgetCents actualCents isCapped vendor }
    settlement_event(orderBy: [{ version: desc }]) { id version status artistTotalCents balanceDueArtistCents }
  } }`, { id });
  const e = data.event; if (!e) notFound();
  const orders = tab === 'orders' ? (await gql(`query($id: ID!) { ticketOrders(where: { event: { id: { equals: $id } } }, orderBy: [{ createdAt: desc }], take: 100) { id orderNumber status totalCents guestName } }`, { id })).ticketOrders : [];
  const seats = tab === 'seating' ? (await gql(`query($id: ID!) { seatInventories(where: { event: { id: { equals: $id } } }, take: 2000, orderBy: [{ id: asc }]) { id status seat { label row chartSection { name } } } }`, { id })).seatInventories : [];
  const bySection: Record<string, any[]> = {};
  for (const s of seats) (bySection[s.seat?.chartSection?.name || 'Seats'] ||= []).push(s);
  const base = `/dashboard/platform/events/${id}`;
  return (
    <Page title={e.title} action={<EventActions eventId={e.id} status={e.status} />}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><StatusLabel status={e.status} /><span>{e.venue?.name}, {e.venue?.city}</span><span>{when(e.showAt, e.venue?.timezone)}</span></div>
      <div className="max-w-full overflow-x-auto"><div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => <Link key={t} href={`${base}?tab=${t}`} className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-sm capitalize', tab === t ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground')}>{t}</Link>)}
      </div></div>
      {tab === 'overview' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat name="Sold" value={e.sold} /><Stat name="Held" value={e.held} /><Stat name="Open" value={e.open} /><Stat name="Gross" value={money(e.gross)} />
        <Stat name="Doors" value={when(e.doorsAt, e.venue?.timezone)} /><Stat name="Curfew" value={when(e.curfewAt, e.venue?.timezone)} /><Stat name="Age" value={label(e.ageRestriction)} /><Stat name="Chart" value={e.seatingChart ? `${e.seatingChart.name} v${e.seatingChart.version}` : ''} /></div>}
      {tab === 'billing' && <Rows empty="No billing.">{e.eventArtist_event.map((a: any) => <Row key={a.id} title={a.artist.name} meta={`${label(a.billing)} · ${a.setMinutes || 0} min`} right={`#${a.position}`} />)}</Rows>}
      {tab === 'pricing' && <Rows empty="No price levels.">{e.priceLevel_event.map((l: any) => <Row key={l.id} title={l.name} meta={l.priceLevelPhase_priceLevel.map((p: any) => `${p.name} ${money(p.priceCents)} (${p.sold}/${p.quantity})`).join(' · ') || 'Single price'} right={<>{money(l.priceCents)} + {money(l.feeCents)} fee · {l.sold} sold · {l.held} held · {l.productionHeld} blocked · cap {l.capacity}</>} />)}</Rows>}
      {tab === 'seating' && (seats.length ? <div className="space-y-4">{Object.entries(bySection).map(([name, list]) => <div key={name} className="space-y-2"><h2 className="text-sm font-medium">{name}</h2><div className="flex flex-wrap gap-1">{list.map((s) => <span key={s.id} title={`${s.seat?.label} · ${s.status}`} className={cn('size-3 rounded-sm', SEAT_COLOR[s.status])} />)}</div></div>)}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">{Object.keys(SEAT_COLOR).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cn('size-3 rounded-sm', SEAT_COLOR[k])} />{label(k)}</span>)}</div></div> : <p className="rounded-lg border p-6 text-sm text-muted-foreground">General admission or unpublished: no seat grid.</p>)}
      {tab === 'orders' && <Rows empty="No orders.">{orders.map((o: any) => <Row key={o.id} href="/dashboard/platform/box-office" title={o.orderNumber} status={o.status} meta={o.guestName} right={money(o.totalCents)} />)}</Rows>}
      {tab === 'expenses' && <Rows empty="No expenses.">{e.eventExpense_event.map((x: any) => <Row key={x.id} title={label(x.category)} meta={`${x.vendor || ''}${x.isCapped ? ' · capped' : ''}`} right={<>{money(x.actualCents)} of {money(x.budgetCents)}</>} />)}</Rows>}
      {tab === 'settlement' && <Rows empty="No settlement yet.">{e.settlement_event.map((s: any) => <Row key={s.id} href={`/dashboard/platform/settlements/${s.id}`} title={`Version ${s.version}`} status={s.status} right={<>{money(s.artistTotalCents)} artist · {money(s.balanceDueArtistCents)} due</>} />)}</Rows>}
    </Page>
  );
}
