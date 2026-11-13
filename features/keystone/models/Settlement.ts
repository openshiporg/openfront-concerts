import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { readAccess, commandAccess, catalogAccess, permissions } from '../access';

export const Settlement = list({
 access: readAccess('canManageSettlements'),
 
 fields: {
  hash: text({}),
  version: integer({ defaultValue: 1 }),
  ticketGrossCents: integer({ defaultValue: 0 }),
  ticketFeesCents: integer({ defaultValue: 0 }),
  taxCents: integer({ defaultValue: 0 }),
  compCount: integer({ defaultValue: 0 }),
  paidCount: integer({ defaultValue: 0 }),
  netBoxOfficeCents: integer({ defaultValue: 0 }),
  totalExpensesCents: integer({ defaultValue: 0 }),
  cappedExpensesCents: integer({ defaultValue: 0 }),
  breakevenCents: integer({ defaultValue: 0 }),
  splitPointCents: integer({ defaultValue: 0 }),
  artistGuaranteeCents: integer({ defaultValue: 0 }),
  artistOverageCents: integer({ defaultValue: 0 }),
  artistTotalCents: integer({ defaultValue: 0 }),
  merchVenueShareCents: integer({ defaultValue: 0 }),
  depositsPaidCents: integer({ defaultValue: 0 }),
  balanceDueArtistCents: integer({ defaultValue: 0 }),
  promoterNetCents: integer({ defaultValue: 0 }),
  computedSnapshot: json(),
  approvals: json(),
  status: select({ type: 'string', options: ['draft', 'reviewed', 'signed_promoter', 'signed_artist', 'final', 'void'], defaultValue: 'draft', access: { update: () => false } }),
  event: relationship({ ref: 'Event.settlement_event', many: false }),
  previousVersion: relationship({ ref: 'Settlement.settlement_previousVersion', many: false }),
  settlement_previousVersion: relationship({ ref: 'Settlement.previousVersion', many: true }),
  settlementLine_settlement: relationship({ ref: 'SettlementLine.settlement', many: true }),
  artistPayment_settlement: relationship({ ref: 'ArtistPayment.settlement', many: true }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
