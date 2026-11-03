import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const EventExpense = list({
 access: catalogAccess,
 
 fields: {
  vendor: text({}),
  receipt: text({ access: { read: () => false, create: () => false, update: () => false } }),
  notes: text({}),
  budgetCents: integer({ defaultValue: 0 }),
  actualCents: integer({ defaultValue: 0 }),
  isCapped: checkbox({ defaultValue: false }),
  category: select({ type: 'string', options: ['venue_rent', 'production', 'security', 'stagehands', 'marketing', 'catering', 'insurance', 'ticketing', 'other'], defaultValue: 'venue_rent', access: { update: () => false } }),
  event: relationship({ ref: 'Event.eventExpense_event', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
