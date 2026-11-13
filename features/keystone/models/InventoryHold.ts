import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { readAccess } from '../access';

export const InventoryHold = list({
 // A hold carries the buyer's quote; only order staff read it. Holds are written by checkout commands only.
 access: readAccess('canManageOrders', 'canIssueRefunds'),
 
 fields: {
  holdKey: text({ isIndexed: 'unique', db: { isNullable: true } }),
  secretHash: text({ access: { read: () => false, create: () => false, update: () => false } }),
  presaleCode: text({ access: { read: () => false, create: () => false, update: () => false } }),
  quantity: integer({ defaultValue: 0 }),
  quoteSnapshot: json(),
  expiresAt: timestamp(),
  status: select({ type: 'string', options: ['active', 'converted', 'released', 'expired'], defaultValue: 'active', access: { update: () => false } }),
  event: relationship({ ref: 'Event.inventoryHold_event', many: false }),
  priceLevel: relationship({ ref: 'PriceLevel.inventoryHold_priceLevel', many: false }),
  phase: relationship({ ref: 'PriceLevelPhase.inventoryHold_phase', many: false }),
  customer: relationship({ ref: 'User.inventoryHold_customer', many: false }),
  seats: relationship({ ref: 'SeatInventory.inventoryHold_seats', many: true }),
  order: relationship({ ref: 'TicketOrder.inventoryHold_order', many: false }),
  promoCode: relationship({ ref: 'PromoCode.inventoryHold_promoCode', many: false }),
 promoRedemptions: relationship({ ref: 'PromoRedemption.hold', many: true }),
  ...trackingFields,
 }
});
