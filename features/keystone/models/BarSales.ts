import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const BarSales = list({
 graphql: { plural: 'BarSalesRecords' },
 access: commandAccess,
 
 fields: {
  grossCents: integer({ defaultValue: 0 }),
  promoterShareBps: integer({ defaultValue: 0 }),
  event: relationship({ ref: 'Event.barSales_event', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
