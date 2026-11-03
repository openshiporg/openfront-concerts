import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Offer = list({
 access: catalogAccess,
 
 fields: {
  breakevenBasis: text({}),
  radiusClause: text({}),
  notes: text({}),
  acceptedTermsHash: text({}),
  version: integer({ defaultValue: 1 }),
  guaranteeCents: integer({ defaultValue: 0 }),
  percentageBps: integer({ defaultValue: 0 }),
  promoterProfitBps: integer({ defaultValue: 0 }),
  expenseCapCents: integer({ defaultValue: 0 }),
  merchSplitBps: integer({ defaultValue: 0 }),
  hardMerchSplitBps: integer({ defaultValue: 0 }),
  hospitalityRiderCents: integer({ defaultValue: 0 }),
  depositCents: integer({ defaultValue: 0 }),
  acceptedTerms: json(),
  depositDueAt: timestamp(),
  status: select({ type: 'string', options: ['draft', 'sent', 'accepted', 'declined', 'contracted', 'settled'], defaultValue: 'draft', access: { update: () => false } }),
  dealType: select({ type: 'string', options: ['flat_guarantee', 'versus', 'plus', 'door_deal'], defaultValue: 'flat_guarantee', access: { update: () => false } }),
  event: relationship({ ref: 'Event.offer_event', many: false }),
  artist: relationship({ ref: 'Artist.offer_artist', many: false }),
  eventArtist: relationship({ ref: 'EventArtist.offer_eventArtist', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
