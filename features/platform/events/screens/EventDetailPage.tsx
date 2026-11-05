import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gql } from '../../lib/gql';
import { money, when, label } from '../../lib/format';
import { EventActions } from '../components/EventActions';
import { PriceLevelEditor, PhaseEditor, LevelStatusActions } from '../components/PricingEditors';
import { ExpenseEditor, MerchEditor, DepositEditor } from '../components/SettlementInputs';
import { OfferEditor } from '../../deals/components/OfferEditor';
import { OfferActions } from '../../deals/components/OfferActions';
import { Page, Row, Rows, Stat, StatusLabel } from '../../components/ui-bits';
import { cn } from '@/lib/utils';

const TABS = ['overview', 'billing', 'pricing', 'seating', 'orders', 'expenses', 'settlement'];
const PRICING_OPEN = ['hold', 'announced', 'presale', 'on_sale', 'sold_out', 'postponed', 'doors'];
const OFFER_FIELDS = 'id status version dealType guaranteeCents percentageBps promoterProfitBps expenseCapCents merchSplitBps hardMerchSplitBps hospitalityRiderCents depositCents depositDueAt radiusClause breakevenBasis notes acceptedTerms artist { id name }';
const SEAT_COLOR: Record<string, string> = { open: 'bg-emerald-500', held: 'bg-amber-500', sold: 'bg-zinc-800 dark:bg-zinc-200', killed: 'bg-red-500', comp: 'bg-sky-500', reserved_hold: 'bg-violet-500' };

export async function EventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params; const { tab = 'overview' } = await searchParams;
  const data = await gql(`query($id: ID!) { event(where: { id: $id }) {
    id title status showAt doorsAt curfewAt ageRestriction onSaleAt description sold held kills open gross venue { name city timezone } seatingChart { name version chartSection_chart(orderBy: [{ sort: asc }]) { id name kind capacity } } tour { name }
    eventArtist_event(orderBy: [{ position: asc }]) { id billing position setMinutes artist { name } }
    offer_event(orderBy: [{ version: desc }]) { ${OFFER_FIELDS} }
    priceLevel_event(orderBy: [{ priceCents: desc }]) { id name status priceCents feeCents facilityFeeCents perOrderLimit capacity sold held productionHeld sections { id name } priceLevelPhase_priceLevel(orderBy: [{ sort: asc }]) { id name priceCents quantity sold sort startsAt } }
    eventExpense_event(orderBy: [{ createdAt: asc }]) { id category budgetCents actualCents isCapped vendor notes }
    merchSales_event { id softGrossCents hardGrossCents sellerFeeCents venueShareCents countIn countOut }
    settlement_event(orderBy: [{ version: desc }]) { id version status artistTotalCents balanceDueArtistCents artistPayment_settlement { id kind amountCents status method reference } }
  } }`, { id });
  const e = data.event; if (!e) notFound();
  const artists = tab === 'billing' ? (await gql(`query { artists(orderBy: [{ name: asc }], take: 500) { id name } }`)).artists.map((a: any) => ({ value: a.id, label: a.name })) : [];
  const sections = e.seatingChart?.chartSection_chart || [];
  const pricingOpen = PRICING_OPEN.includes(e.status);
  const frozen = e.settlement_event.some((s: any) => ['signed_promoter', 'signed_artist', 'final'].includes(s.status));
  const inputsOpen = !frozen && !['cancelled', 'settled'].includes(e.status);
  const deposits = e.settlement_event.flatMap((s: any) => s.artistPayment_settlement).filter((p: any) => p.kind === 'deposit');
  const depositPaid = deposits.filter((p: any) => p.status === 'paid').reduce((n: number, p: any) => n + p.amountCents, 0);
  const liveDeal = e.offer_event.filter((o: any) => ['accepted', 'contracted'].includes(o.status));
  const depositAgreed = liveDeal.reduce((n: number, o: any) => n + (o.acceptedTerms?.depositCents || 0), 0);
  const merch = e.merchSales_event[0];
  const totals = e.eventExpense_event.reduce((t: any, x: any) => ({ budget: t.budget + x.budgetCents, actual: t.actual + x.actualCents, capped: t.capped + (x.isCapped ? x.actualCents : 0) }), { budget: 0, actual: 0, capped: 0 });
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
      {tab === 'billing' && <div className="space-y-4">
        <Rows empty="No billing.">{e.eventArtist_event.map((a: any) => <Row key={a.id} title={a.artist.name} meta={`${label(a.billing)} · ${a.setMinutes || 0} min`} right={`#${a.position}`} />)}</Rows>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">Offers</h2>{!['completed', 'settling', 'settled', 'cancelled'].includes(e.status) ? <OfferEditor eventId={e.id} artists={artists} /> : null}</div>
        <Rows empty="No offers.">{e.offer_event.map((o: any) => <Row key={o.id} title={`${o.artist?.name} · v${o.version}`} status={o.status} meta={<div className="space-y-2"><div>{label(o.dealType)} · guarantee {money(o.guaranteeCents)}{o.percentageBps ? ` · ${o.percentageBps / 100}%` : ''} · cap {money(o.expenseCapCents)} · deposit {money(o.depositCents)}</div>
          <div className="flex flex-wrap items-start gap-2"><OfferActions offerId={o.id} status={o.status} />{['draft', 'sent', 'accepted', 'declined'].includes(o.status) && !frozen ? <OfferEditor offer={o} /> : null}</div></div>} />)}</Rows>
      </div>}
      {tab === 'pricing' && <div className="space-y-4">
        {pricingOpen ? <PriceLevelEditor eventId={e.id} sections={sections} /> : <p className="text-sm text-muted-foreground">Pricing is closed for a {label(e.status)} event.</p>}
        <Rows empty="No price levels.">{e.priceLevel_event.map((l: any) => <Row key={l.id} title={l.name} status={l.status} meta={<div className="space-y-2">
          <div>{l.sections.map((s: any) => s.name).join(', ') || 'No sections'} · limit {l.perOrderLimit} per order</div>
          {l.priceLevelPhase_priceLevel.length ? <div className="divide-y rounded-md border">{l.priceLevelPhase_priceLevel.map((p: any) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span>{p.name} · {money(p.priceCents)} · {p.sold}/{p.quantity} sold</span>{pricingOpen && l.status !== 'closed' ? <PhaseEditor levelId={l.id} phase={p} nextSort={p.sort} /> : null}</div>)}</div> : <div>Single price</div>}
          {pricingOpen && l.status !== 'closed' ? <div className="flex flex-wrap items-start gap-2"><PriceLevelEditor eventId={e.id} sections={sections} level={l} /><PhaseEditor levelId={l.id} nextSort={(l.priceLevelPhase_priceLevel.at(-1)?.sort ?? -1) + 1} /><LevelStatusActions levelId={l.id} status={l.status} /></div> : null}
        </div>} right={<>{money(l.priceCents)} + {money(l.feeCents)} fee{l.facilityFeeCents ? ` + ${money(l.facilityFeeCents)} facility` : ''} · {l.sold} sold · {l.held} held · {l.productionHeld} blocked · cap {l.capacity}</>} />)}</Rows>
      </div>}
      {tab === 'seating' && (seats.length ? <div className="space-y-4">{Object.entries(bySection).map(([name, list]) => <div key={name} className="space-y-2"><h2 className="text-sm font-medium">{name}</h2><div className="flex flex-wrap gap-1">{list.map((s) => <span key={s.id} title={`${s.seat?.label} · ${s.status}`} className={cn('size-3 rounded-sm', SEAT_COLOR[s.status])} />)}</div></div>)}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">{Object.keys(SEAT_COLOR).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cn('size-3 rounded-sm', SEAT_COLOR[k])} />{label(k)}</span>)}</div></div> : <p className="rounded-lg border p-6 text-sm text-muted-foreground">General admission or unpublished: no seat grid.</p>)}
      {tab === 'orders' && <Rows empty="No orders.">{orders.map((o: any) => <Row key={o.id} href="/dashboard/platform/box-office" title={o.orderNumber} status={o.status} meta={o.guestName} right={money(o.totalCents)} />)}</Rows>}
      {tab === 'expenses' && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat name="Budget" value={money(totals.budget)} /><Stat name="Actual" value={money(totals.actual)} /><Stat name="Variance" value={money(totals.budget - totals.actual)} /><Stat name="Capped actual" value={money(totals.capped)} /></div>
        {inputsOpen ? <ExpenseEditor eventId={e.id} /> : <p className="text-sm text-muted-foreground">{frozen ? 'Settlement is signed; correct it with an approved adjustment.' : `Expenses are closed for a ${label(e.status)} event.`}</p>}
        <Rows empty="No expenses.">{e.eventExpense_event.map((x: any) => <Row key={x.id} title={label(x.category)} meta={<div className="space-y-2"><div>{[x.vendor, x.isCapped ? 'capped' : 'uncapped', x.notes].filter(Boolean).join(' · ')}</div>{inputsOpen ? <ExpenseEditor eventId={e.id} expense={x} /> : null}</div>} right={<>{money(x.actualCents)} of {money(x.budgetCents)}{x.budgetCents && x.actualCents > x.budgetCents ? ` · over ${money(x.actualCents - x.budgetCents)}` : ''}</>} />)}</Rows>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">Merch</h2>{inputsOpen && liveDeal.length ? <MerchEditor eventId={e.id} current={merch} /> : null}</div>
        {merch ? <div className="space-y-2 rounded-lg border p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>Soft {money(merch.softGrossCents)} · hard {money(merch.hardGrossCents)}{merch.sellerFeeCents ? ` · seller fee ${money(merch.sellerFeeCents)}` : ''}</span><span className="font-medium tabular-nums">Venue share {money(merch.venueShareCents)}</span></div>
          {merch.countIn ? <div className="divide-y rounded-md border">{Object.keys(merch.countIn).map((k) => <div key={k} className="flex flex-wrap justify-between gap-2 px-3 py-2"><span>{k}</span><span className="tabular-nums text-muted-foreground">in {merch.countIn[k]} · out {merch.countOut?.[k] ?? 0} · sold {merch.countIn[k] - (merch.countOut?.[k] ?? 0)}</span></div>)}</div> : null}</div>
          : <p className="rounded-lg border p-6 text-sm text-muted-foreground">{liveDeal.length ? 'No merch recorded.' : 'Merch needs an accepted deal for the venue split.'}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">Artist deposits</h2>{inputsOpen && depositAgreed > depositPaid ? <DepositEditor eventId={e.id} leftCents={depositAgreed - depositPaid} /> : null}</div>
        <p className="text-sm text-muted-foreground">{money(depositPaid)} paid of {money(depositAgreed)} agreed.</p>
        <Rows empty="No deposits recorded.">{deposits.map((p: any) => <Row key={p.id} title={`${({ wire: 'Wire', ach: 'ACH', check: 'Check', cash: 'Cash' } as Record<string, string>)[p.method] || label(p.method)} ${p.reference}`} status={p.status} right={money(p.amountCents)} />)}</Rows>
      </div>}
      {tab === 'settlement' && <Rows empty="No settlement yet.">{e.settlement_event.map((s: any) => <Row key={s.id} href={`/dashboard/platform/settlements/${s.id}`} title={`Version ${s.version}`} status={s.status} right={<>{money(s.artistTotalCents)} artist · {money(s.balanceDueArtistCents)} due</>} />)}</Rows>}
    </Page>
  );
}
