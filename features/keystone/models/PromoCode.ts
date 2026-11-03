import { list } from '@keystone-6/core';
import { text, integer, select, relationship, timestamp } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { catalogAccess } from '../access';

export const PromoCode = list({
  access: catalogAccess,
  fields: {
    code: text({ isIndexed: 'unique', validation: { isRequired: true, match: { regex: /^[A-Z0-9_-]+$/, explanation: 'Uppercase letters, numbers, - and _' } } }),
    discountType: select({ type: 'string', options: ['percent_bps', 'amount_cents', 'comp'], defaultValue: 'percent_bps' }),
    value: integer({ defaultValue: 0, validation: { min: 0 } }),
    maxUses: integer({ validation: { min: 1 } }),
    usedCount: integer({ defaultValue: 0, access: { create: () => false, update: () => false } }),
    perOrderLimit: integer({ validation: { min: 1 } }),
    startsAt: timestamp(),
    endsAt: timestamp(),
    status: select({ type: 'string', options: ['active', 'paused', 'expired'], defaultValue: 'active' }),
    event: relationship({ ref: 'Event.promoCode_event', many: false }),
    priceLevels: relationship({ ref: 'PriceLevel.promoCode_priceLevels', many: true }),
    tour: relationship({ ref: 'Tour.promoCodes', many: false }),
    inventoryHold_promoCode: relationship({ ref: 'InventoryHold.promoCode', many: true }),
    redemptions: relationship({ ref: 'PromoRedemption.promoCode', many: true }),
    ...trackingFields,
  },
});
