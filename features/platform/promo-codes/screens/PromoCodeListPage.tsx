import { gql } from '../../lib/gql';
import { label, money } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';
import { roleFlags } from '../../lib/guard';
import { RecordEditor, type FieldSpec } from '../../components/RecordEditor';

export async function PromoCodeListPage() {
  const { canManageEvents } = await roleFlags('canManageEvents');
  const data = await gql(`{ promoCodes(orderBy: [{ code: asc }]) { id code status discountType value maxUses perOrderLimit startsAt endsAt usedCount event { id title } } events(where: { status: { in: ["hold", "announced", "presale", "on_sale", "sold_out", "postponed"] } }, orderBy: [{ showAt: asc }]) { id title } }`);
  const fields: FieldSpec[] = [
    { name: 'code', label: 'Code', required: true, hint: 'A–Z, 0–9, - and _' },
    { name: 'status', label: 'Status', kind: 'select', options: [['active', 'Active'], ['paused', 'Paused'], ['expired', 'Expired']] },
    { name: 'discountType', label: 'Discount', kind: 'select', options: [['percent_bps', 'Percent off'], ['amount_cents', 'Amount off ($)'], ['comp', 'Comp (free)']] },
    { name: 'value', label: 'Amount', kind: 'discount', hint: '% or $; blank for comp' },
    { name: 'event', label: 'Event', kind: 'relation', options: data.events.map((e: any) => [e.id, e.title]), hint: 'None = all events', wide: true },
    { name: 'maxUses', label: 'Max uses', kind: 'int', hint: 'blank = unlimited' },
    { name: 'perOrderLimit', label: 'Per order', kind: 'int' },
    { name: 'startsAt', label: 'Starts', kind: 'date' },
    { name: 'endsAt', label: 'Ends', kind: 'date' },
  ];
  return (
    <Page title="Promo and presale codes">
      {canManageEvents ? <RecordEditor list="PromoCode" fields={fields} values={{ status: 'active', discountType: 'percent_bps' }} trigger="Add code" title="New promo code" /> : null}
      <Rows empty="No codes.">{data.promoCodes.map((c: any) => <Row key={c.id} title={c.code} status={c.status} meta={`${c.event?.title || 'All events'} · ${({ percent_bps: 'Percent off', amount_cents: 'Amount off', comp: 'Comp' } as Record<string, string>)[c.discountType] || label(c.discountType)}`} right={<>{c.discountType === 'amount_cents' ? money(c.value) : c.discountType === 'percent_bps' ? `${c.value / 100}%` : 'Comp'} · {c.usedCount}/{c.maxUses ?? '∞'} used{canManageEvents ? <RecordEditor list="PromoCode" id={c.id} values={c} fields={fields} trigger="Edit" title={`Edit ${c.code}`} /> : null}</>} />)}</Rows>
    </Page>
  );
}
