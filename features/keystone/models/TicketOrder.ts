import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const TicketOrder = list({
 access: commandAccess,
 
 fields: {
  orderNumber: text({ isIndexed: 'unique', db: { isNullable: true } }),
  guestEmail: text({}),
  guestName: text({}),
  secretKey: text({ access: { read: () => false, create: () => false, update: () => false } }),
  subtotalCents: integer({ defaultValue: 0 }),
  serviceFeesCents: integer({ defaultValue: 0 }),
  facilityFeesCents: integer({ defaultValue: 0 }),
  taxCents: integer({ defaultValue: 0 }),
  discountCents: integer({ defaultValue: 0 }),
  totalCents: integer({ defaultValue: 0 }),
  refundedCents: integer({ defaultValue: 0 }),
  ageAttested: checkbox({ defaultValue: false }),
  status: select({ type: 'string', options: ['pending_payment', 'paid', 'partially_refunded', 'refunded', 'cancelled', 'comp'], defaultValue: 'pending_payment', access: { update: () => false } }),
  source: select({ type: 'string', options: ['online', 'box_office', 'comp', 'presale'], defaultValue: 'online', access: { update: () => false } }),
  customer: relationship({ ref: 'User.ticketOrder_customer', many: false }),
  event: relationship({ ref: 'Event.ticketOrder_event', many: false }),
  paymentCollection: relationship({ ref: 'PaymentCollection.ticketOrder_paymentCollection', many: false }),
  inventoryHold_order: relationship({ ref: 'InventoryHold.order', many: true }),
  ticketOrderLine_order: relationship({ ref: 'TicketOrderLine.order', many: true }),
  ticket_order: relationship({ ref: 'Ticket.order', many: true }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  payments: relationship({ ref: 'Payment.order', many: true }),
  ...trackingFields,
 }
});
