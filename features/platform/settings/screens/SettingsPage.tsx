import { gql } from '../../lib/gql';
import { roleFlags } from '../../lib/guard';
import { Page } from '../../components/ui-bits';
import { SettingsForm } from '../components/SettingsForm';

export async function SettingsPage() {
  const [data, can] = await Promise.all([
    gql(`{ storeSettingsRecords(take: 1) { id name currencyCode refundApprovalThresholdCents supportEmail supportPhone refundPolicy } }`),
    roleFlags('canManageEvents'),
  ]);
  const s = data.storeSettingsRecords[0];
  return (
    <Page title="Settings">
      {s ? <SettingsForm settings={s} canEdit={can.canManageEvents} /> : <p className="text-sm text-muted-foreground">Run setup from the sidebar to create settings.</p>}
    </Page>
  );
}
