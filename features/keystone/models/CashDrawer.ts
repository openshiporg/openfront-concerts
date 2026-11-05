import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';
import { permissions } from '../access';
import { trackingFields } from './trackingFields';

/**
 * A box-office cash drawer shift. Door cash sales and cash refunds are attributed to the cashier's open drawer
 * (by id in Payment.data / Refund.providerData). Closing records the blind count against the expected cash.
 * Written only by server commands.
 */
export const CashDrawer = list({
  access: { operation: { query: ({ session }) => permissions.canManageOrders({ session }) || permissions.canReadPayments({ session }), create: () => false, update: () => false, delete: () => false } },
  fields: {
    label: text({ validation: { isRequired: true } }),
    status: select({ type: 'string', options: ['open', 'closed'], defaultValue: 'open', validation: { isRequired: true }, isIndexed: true }),
    openKey: text({ isIndexed: 'unique', db: { isNullable: true } }),
    openingFloatCents: integer({ validation: { isRequired: true } }),
    cashSalesCents: integer({ defaultValue: 0 }),
    cashRefundsCents: integer({ defaultValue: 0 }),
    expectedCents: integer(),
    countedCents: integer(),
    varianceCents: integer(),
    varianceReason: text(),
    count: json(),
    openedAt: timestamp({ validation: { isRequired: true } }),
    closedAt: timestamp(),
    openedBy: relationship({ ref: 'User' }),
    closedBy: relationship({ ref: 'User' }),
    currencyCode: text({ defaultValue: 'USD' }),
    ...trackingFields,
  },
  ui: { isHidden: true },
});
