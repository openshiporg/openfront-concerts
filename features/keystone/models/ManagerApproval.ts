import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';
import { permissions } from '../access';
import { trackingFields } from './trackingFields';

/** Action-bound, one-time independent approval (adapted from Restaurant). Written only by server commands. */
export const ManagerApproval = list({
  access: { operation: { query: ({ session }) => permissions.canIssueRefunds({ session }) || permissions.canApproveAdjustments({ session }), create: () => false, update: () => false, delete: () => false } },
  fields: {
    actionType: select({ type: 'string', options: ['refund_payment'], validation: { isRequired: true }, isIndexed: true }),
    targetId: text({ validation: { isRequired: true }, isIndexed: true }),
    reason: text({ validation: { isRequired: true } }),
    amount: integer(),
    requestFingerprint: text({ validation: { isRequired: true } }),
    requestPayload: json(),
    status: select({ type: 'string', options: ['pending', 'approved', 'rejected', 'consumed', 'expired'], defaultValue: 'pending', validation: { isRequired: true }, isIndexed: true }),
    approvedAt: timestamp(),
    consumedAt: timestamp(),
    expiresAt: timestamp({ validation: { isRequired: true }, isIndexed: true }),
    consumedEntityType: text(),
    consumedEntityId: text(),
    requestedBy: relationship({ ref: 'User' }),
    approvedBy: relationship({ ref: 'User' }),
    ...trackingFields,
  },
  ui: { isHidden: true },
});
