import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { readAccess, commandAccess, catalogAccess, permissions } from '../access';

export const ScanEvent = list({
 access: readAccess('canScanTickets', 'canManageOrders', 'canIssueRefunds'),
 
 fields: {
  gate: text({}),
  at: timestamp(),
  result: select({ type: 'string', options: ['admitted', 'duplicate', 'wrong_event', 'void', 'reentry'], defaultValue: 'admitted', access: { update: () => false } }),
  ticket: relationship({ ref: 'Ticket.scanEvent_ticket', many: false }),
  event: relationship({ ref: 'Event.scanEvent_event', many: false }),
  scannedBy: relationship({ ref: 'User.scanEvent_scannedBy', many: false }),
  ...trackingFields,
 }
});
