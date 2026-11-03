import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Venue = list({
 access: catalogAccess,
 
 fields: {
  name: text({}),
  city: text({}),
  timezone: text({}),
  address: text({}),
  contact: text({}),
  capacity: integer({ defaultValue: 0 }),
  defaultFacilityFeeCents: integer({ defaultValue: 0 }),
  taxBps: integer({ defaultValue: 0 }),
  ownedByPromoter: checkbox({ defaultValue: false }),
  rentTermsDefault: json(),
  seatingChart_venue: relationship({ ref: 'SeatingChart.venue', many: true }),
  event_venue: relationship({ ref: 'Event.venue', many: true }),
  dateHold_venue: relationship({ ref: 'DateHold.venue', many: true }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
