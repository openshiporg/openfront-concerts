import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const ArtistPayment = list({
 access: commandAccess,
 
 fields: {
  method: text({}),
  reference: text({}),
  amountCents: integer({ defaultValue: 0 }),
  kind: select({ type: 'string', options: ['deposit', 'balance'], defaultValue: 'deposit', access: { update: () => false } }),
  status: select({ type: 'string', options: ['scheduled', 'paid', 'void'], defaultValue: 'scheduled', access: { update: () => false } }),
  settlement: relationship({ ref: 'Settlement.artistPayment_settlement', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
