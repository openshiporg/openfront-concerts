import { notFound } from 'next/navigation';
import { requireAnyPermission } from '../../lib/guard';
import { gql } from '../../lib/gql';
import { when } from '../../lib/format';
import { Page, Row, Rows, Stat } from '../../components/ui-bits';
import { ScanConsole } from '../components/ScanConsole';

export async function DoorPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requireAnyPermission('canScanTickets');
  const { event: selected } = await searchParams;
  const list = await gql(`{ events(where: { status: { in: ["on_sale", "sold_out", "doors", "in_progress", "completed"] } }, orderBy: [{ showAt: asc }], take: 30) { id title status showAt } }`);
  // A named event that is not open for scanning is a 404, never another event's door.
  let named = selected === undefined ? null : list.events.find((e: any) => e.id === selected);
  if (selected !== undefined && !named) {
    const found = await gql(`query($id: ID!) { events(where: { id: { equals: $id }, status: { in: ["on_sale", "sold_out", "doors", "in_progress", "completed"] } }, take: 1) { id title status showAt } }`, { id: String(selected) }).catch(() => ({ events: [] }));
    named = found.events[0];
    if (!named) notFound();
  }
  const current = named || list.events.find((e: any) => ['doors', 'in_progress'].includes(e.status)) || list.events[0];
  const detail = current ? await gql(`query($id: ID!) { admitted: ticketsCount(where: { event: { id: { equals: $id } }, status: { equals: "checked_in" } }) total: ticketsCount(where: { event: { id: { equals: $id } } }) scans: scanEvents(where: { event: { id: { equals: $id } } }, orderBy: [{ at: desc }], take: 15) { id gate result at ticket { ticketCode } } event(where: { id: $id }) { venue { capacity } } }`, { id: current.id }) : null;
  return (
    <Page title="Door scan">
      <Rows empty="No events.">{list.events.map((e: any) => <Row key={e.id} href={`/dashboard/platform/door?event=${e.id}`} title={e.title} status={e.status} meta={when(e.showAt)} />)}</Rows>
      {current && detail ? <section className="space-y-3"><h2 className="text-sm font-medium">{current.title}</h2>
        <div className="grid grid-cols-3 gap-3"><Stat name="Admitted" value={detail.admitted} /><Stat name="Tickets" value={detail.total} /><Stat name="Capacity" value={detail.event?.venue?.capacity ?? ''} /></div>
        {['doors', 'in_progress'].includes(current.status) ? <ScanConsole eventId={current.id} /> : <p className="text-sm text-muted-foreground">Scanning opens when the event is at doors.</p>}
        <Rows empty="No scans.">{detail.scans.map((s: any) => <Row key={s.id} title={s.ticket?.ticketCode} status={s.result === 'admitted' ? 'confirmed' : 'void'} meta={`${s.gate} · ${s.result}`} right={when(s.at)} />)}</Rows></section> : null}
    </Page>
  );
}
