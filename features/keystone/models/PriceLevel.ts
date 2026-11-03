import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const PriceLevel = list({
 access: catalogAccess,
 
 fields: {
  name: text({}),
  priceCents: integer({ defaultValue: 0 }),
  feeCents: integer({ defaultValue: 0 }),
  facilityFeeCents: integer({ defaultValue: 0 }),
  capacity: integer({ defaultValue: 0 }),
  sold: integer({ defaultValue: 0 }),
  held: integer({ defaultValue: 0 }),
  perOrderLimit: integer({ defaultValue: 8 }),
  productionHeld: integer({ defaultValue: 0 }),
  salesStartAt: timestamp(),
  salesEndAt: timestamp(),
  status: select({ type: 'string', options: ['active', 'paused', 'closed'], defaultValue: 'active', access: { update: () => false } }),
  event: relationship({ ref: 'Event.priceLevel_event', many: false }),
  sections: relationship({ ref: 'ChartSection.priceLevel_sections', many: true }),
  priceLevelPhase_priceLevel: relationship({ ref: 'PriceLevelPhase.priceLevel', many: true }),
  seatInventory_priceLevel: relationship({ ref: 'SeatInventory.priceLevel', many: true }),
  productionHold_priceLevel: relationship({ ref: 'ProductionHold.priceLevel', many: true }),
  inventoryHold_priceLevel: relationship({ ref: 'InventoryHold.priceLevel', many: true }),
  promoCode_priceLevels: relationship({ ref: 'PromoCode.priceLevels', many: true }),
  ticketOrderLine_priceLevel: relationship({ ref: 'TicketOrderLine.priceLevel', many: true }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
