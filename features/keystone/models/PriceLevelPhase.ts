import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const PriceLevelPhase = list({
 access: catalogAccess,
 
 fields: {
  name: text({}),
  priceCents: integer({ defaultValue: 0 }),
  quantity: integer({ defaultValue: 0 }),
  sold: integer({ defaultValue: 0 }),
  sort: integer({ defaultValue: 0 }),
  startsAt: timestamp(),
  priceLevel: relationship({ ref: 'PriceLevel.priceLevelPhase_priceLevel', many: false }),
  inventoryHold_phase: relationship({ ref: 'InventoryHold.phase', many: true }),
  ticketOrderLine_phase: relationship({ ref: 'TicketOrderLine.phase', many: true }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
