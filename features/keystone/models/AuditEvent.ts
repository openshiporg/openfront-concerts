import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const AuditEvent = list({
 access: { operation: { query: permissions.canReadAudit, create: () => false, update: () => false, delete: () => false } },
 
 fields: {
  action: text({}),
  targetList: text({}),
  targetId: text({}),
  reason: text({}),
  requestId: text({}),
  before: json(),
  after: json(),
  actor: relationship({ ref: 'User.auditEvent_actor', many: false }),
  ...trackingFields,
 }
});
