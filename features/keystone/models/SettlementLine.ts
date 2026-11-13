import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { readAccess, commandAccess, catalogAccess, permissions } from '../access';

export const SettlementLine = list({
 access: readAccess('canManageSettlements'),
 
 fields: {
  label: text({}),
  sourceRef: text({}),
  reason: text({}),
  amountCents: integer({ defaultValue: 0 }),
  roundingRemainder: integer({ defaultValue: 0 }),
  kind: select({ type: 'string', options: ['gross', 'fee', 'tax', 'expense', 'guarantee', 'overage', 'merch', 'deposit', 'adjustment', 'rounding', 'payment'], defaultValue: 'gross', access: { update: () => false } }),
  settlement: relationship({ ref: 'Settlement.settlementLine_settlement', many: false }),
  approvedBy: relationship({ ref: 'User.settlementLine_approvedBy', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...trackingFields,
 }
});
