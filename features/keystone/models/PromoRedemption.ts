import { list } from '@keystone-6/core';
import { integer, select, relationship } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { readAccess, commandAccess } from '../access';

export const PromoRedemption = list({
  access: readAccess('canManageOrders', 'canIssueRefunds'),
  graphql: { plural: 'PromoRedemptionRecords' },
  fields: {
    promoCode: relationship({ ref: 'PromoCode.redemptions' }),
    hold: relationship({ ref: 'InventoryHold.promoRedemptions' }),
    order: relationship({ ref: 'TicketOrder.promoRedemptions' }),
    amountCents: integer({ defaultValue: 0 }),
    status: select({ type: 'string', options: ['reserved', 'committed', 'released'], defaultValue: 'reserved', access: { update: () => false } }),
    ...trackingFields,
  },
});
