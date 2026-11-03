import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const PromoCode = list({
 access: catalogAccess,
 
 fields: {
  code: text({ isIndexed: 'unique', db: { isNullable: true } }),
  scope: text({}),
  maxUses: integer({ defaultValue: 0 }),
  uses: integer({ defaultValue: 0 }),
  reservedUses: integer({ defaultValue: 0 }),
  discountBps: integer({ defaultValue: 0 }),
  startsAt: timestamp(),
  endsAt: timestamp(),
  status: select({ type: 'string', options: ['active', 'disabled'], defaultValue: 'active', access: { update: () => false } }),
  event: relationship({ ref: 'Event.promoCode_event', many: false }),
  priceLevels: relationship({ ref: 'PriceLevel.promoCode_priceLevels', many: true }),
  inventoryHold_promoCode: relationship({ ref: 'InventoryHold.promoCode', many: true }),
  ...trackingFields,
 }
});
