import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { storeLogoFields } from "./storeLogoFields";
import { commandAccess, catalogAccess, permissions } from '../access';

export const StoreSettings = list({
 graphql: { plural: 'StoreSettingsRecords' },
 access: catalogAccess,
 
 fields: {
  name: text({}),
  refundApprovalThresholdCents: integer({ defaultValue: 0 }),
  manager: relationship({ ref: 'User.storeSettings_manager', many: false }),
  currencyCode: text({ defaultValue: 'USD', validation: { match: { regex: /^[A-Z]{3}$/, explanation: 'ISO 4217 currency code' } } }),
  ...storeLogoFields,
  ...trackingFields,
 }
});
