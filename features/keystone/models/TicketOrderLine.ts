import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const TicketOrderLine = list({
 access: commandAccess,
 
 fields: {
  title: text({}),
  levelName: text({}),
  phaseName: text({}),
  seatLabel: text({}),
  unitPriceCents: integer({ defaultValue: 0 }),
  serviceFeeCents: integer({ defaultValue: 0 }),
  facilityFeeCents: integer({ defaultValue: 0 }),
  taxCents: integer({ defaultValue: 0 }),
  quantity: integer({ defaultValue: 0 }),
  discountCents: integer({ defaultValue: 0 }),
  totalCents: integer({ defaultValue: 0 }),
  order: relationship({ ref: 'TicketOrder.ticketOrderLine_order', many: false }),
  priceLevel: relationship({ ref: 'PriceLevel.ticketOrderLine_priceLevel', many: false }),
  phase: relationship({ ref: 'PriceLevelPhase.ticketOrderLine_phase', many: false }),
  ticket_line: relationship({ ref: 'Ticket.line', many: true }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
