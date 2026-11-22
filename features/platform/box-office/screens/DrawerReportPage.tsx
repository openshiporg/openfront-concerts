import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gql } from '../../lib/gql';
import { keystoneContext } from '@/features/keystone/context';
import { money, when } from '../../lib/format';
import { Page, Row, Rows, Stat } from '../../components/ui-bits';
import { drawerTotals, reportRange } from '@/features/keystone/lib/cash-drawer';
import { zonedDateTime } from '@/features/keystone/lib/venue-time';
import { DrawerRangeForm } from '../components/DrawerRangeForm';
import { ForceCloseDrawer } from '../components/ForceCloseDrawer';

const ZONE = 'America/Los_Angeles';
const todayIn = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date());

/** Cash drawer shifts opened in a date range (store clock): totals, every shift, and a manager's close of someone else's open drawer. */
export async function DrawerReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const who = await gql(`query { authenticatedItem { ... on User { id role { canManageOrders canReadPayments canApproveAdjustments } } } }`).catch(() => null);
  const me = who?.authenticatedItem;
  if (!me?.role?.canManageOrders && !me?.role?.canReadPayments) notFound();
  let range; let rangeError = '';
  try { range = reportRange(sp.from, sp.to, todayIn()); } catch (e: any) { rangeError = e.message; range = reportRange(undefined, undefined, todayIn()); }
  const start = zonedDateTime(range.from, '00:00', ZONE).toISOString();
  const end = zonedDateTime(range.endExclusive, '00:00', ZONE).toISOString();
  // The role was checked above; read with sudo so the cashier's name shows even to roles that cannot list other people.
  const data = await keystoneContext.sudo().query.CashDrawer.findMany({
    where: { openedAt: { gte: start, lt: end } }, orderBy: [{ openedAt: 'desc' }], take: 201,
    query: 'id label status openingFloatCents cashSalesCents cashRefundsCents expectedCents countedCents varianceCents varianceReason openedAt closedAt openedBy { id name } closedBy { id name }',
  }).then((cashDrawers: any) => ({ cashDrawers })).catch(() => null);
  if (!data) return <Page title="Cash drawers"><p className="rounded-lg border p-6 text-sm text-muted-foreground">Drawer report could not load.</p></Page>;
  const truncated = data.cashDrawers.length > 200;
  const rows = data.cashDrawers.slice(0, 200);
  const t = drawerTotals(rows);
  const canForce = Boolean(me.role.canApproveAdjustments);
  const label = range.from === range.to ? range.from : `${range.from} to ${range.to}`;
  return (
    <Page title="Cash drawers" action={<Link className="inline-flex min-h-11 items-center text-sm underline" href="/dashboard/platform/box-office">Back to box office</Link>}>
      <DrawerRangeForm from={range.from} to={range.to} />
      {rangeError ? <p className="text-sm text-destructive">{rangeError}. Showing today.</p> : null}
      <p className="text-sm text-muted-foreground">Shifts opened {label}, store time. {t.drawers} {t.drawers === 1 ? 'drawer' : 'drawers'}{t.open ? `, ${t.open} still open` : ''}.</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat name="Opening floats" value={money(t.floatCents)} />
        <Stat name="Cash sales" value={money(t.salesCents)} />
        <Stat name="Cash refunds" value={money(t.refundsCents)} />
        <Stat name="Net variance (closed)" value={`${t.varianceCents > 0 ? '+' : t.varianceCents < 0 ? '−' : ''}${money(Math.abs(t.varianceCents))}`} />
      </div>
      <Rows empty="No drawers were opened in this range.">
        {rows.map((d: any) => {
          const open = d.status === 'open';
          const mine = d.openedBy?.id === me.id;
          const closedByOther = d.closedBy?.id && d.closedBy.id !== d.openedBy?.id;
          return <Row key={d.id} title={`${d.label} · ${d.openedBy?.name || 'unknown cashier'}`} status={open ? 'open' : d.varianceCents === 0 ? 'balanced' : d.varianceCents > 0 ? 'over' : 'short'}
            meta={<>{`Float ${money(d.openingFloatCents)} + cash sales ${money(d.cashSalesCents)} − cash refunds ${money(d.cashRefundsCents)} · opened ${when(d.openedAt)}${d.closedAt ? ` · closed ${when(d.closedAt)}` : ''}${closedByOther ? ` by ${d.closedBy.name} (manager close)` : ''}${d.varianceReason ? ` · ${d.varianceReason}` : ''}`}
              {open && canForce && !mine ? <ForceCloseDrawer drawerId={d.id} label={d.label} cashier={d.openedBy?.name || 'the cashier'} /> : null}</>}
            right={open ? null : <>Counted {money(d.countedCents)} of {money(d.expectedCents)}{d.varianceCents ? ` · ${d.varianceCents > 0 ? '+' : '−'}${money(Math.abs(d.varianceCents))}` : ''}</>} />;
        })}
      </Rows>
      {truncated ? <p className="text-sm text-muted-foreground">Showing the 200 most recent. Narrow the range to see the rest.</p> : null}
    </Page>
  );
}
