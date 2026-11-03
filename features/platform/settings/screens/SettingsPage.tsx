import { gql } from '../../lib/gql';
import { money } from '../../lib/format';
import { Page, Stat } from '../../components/ui-bits';

export async function SettingsPage() {
  const data = await gql(`{ storeSettingsRecords(take: 1) { id name currencyCode refundApprovalThresholdCents } }`);
  const s = data.storeSettingsRecords[0];
  return (
    <Page title="Settings">
      {s ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Stat name="Promoter" value={s.name} /><Stat name="Currency" value={s.currencyCode} /><Stat name="Refund approval above" value={money(s.refundApprovalThresholdCents, s.currencyCode)} /></div> : <p className="text-sm text-muted-foreground">Run setup from the sidebar to create settings.</p>}
    </Page>
  );
}
