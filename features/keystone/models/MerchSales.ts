import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { readAccess, commandAccess, catalogAccess, permissions } from '../access';

export const MerchSales = list({
 graphql: { plural: 'MerchSalesRecords' },
 access: readAccess('canManageSettlements'),
 
 fields: {
  softGrossCents: integer({ defaultValue: 0 }),
  hardGrossCents: integer({ defaultValue: 0 }),
  venueSoftSplitBps: integer({ defaultValue: 0 }),
  venueHardSplitBps: integer({ defaultValue: 0 }),
  venueShareCents: integer({ defaultValue: 0 }),
  sellerFeeCents: integer({ defaultValue: 0 }),
  countIn: json(),
  countOut: json(),
  event: relationship({ ref: 'Event.merchSales_event', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
