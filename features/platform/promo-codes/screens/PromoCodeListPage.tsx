import { gql } from '../../lib/gql';
import { label, money } from '../../lib/format';
import { Page, Row, Rows } from '../../components/ui-bits';

export async function PromoCodeListPage() {
  const data = await gql(`{ promoCodes(orderBy: [{ code: asc }]) { id code status discountType value maxUses usedCount event { title } } }`);
  return (
    <Page title="Promo and presale codes">
      <Rows empty="No codes.">{data.promoCodes.map((c: any) => <Row key={c.id} title={c.code} status={c.status} meta={`${c.event?.title || 'All events'} · ${label(c.discountType)}`} right={<>{c.discountType === 'amount_cents' ? money(c.value) : c.discountType === 'percent_bps' ? `${c.value / 100}%` : 'Comp'} · {c.usedCount}/{c.maxUses ?? '∞'} used</>} />)}</Rows>
    </Page>
  );
}
