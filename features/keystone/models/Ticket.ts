import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Ticket = list({
 access: commandAccess,
 
 fields: {
  ticketCode: text({ isIndexed: 'unique', db: { isNullable: true } }),
  tokenHash: text({ access: { read: () => false, create: () => false, update: () => false } }),
  holderName: text({}),
  holderEmail: text({}),
  status: select({ type: 'string', options: ['valid', 'checked_in', 'void', 'refunded', 'transferred'], defaultValue: 'valid', access: { update: () => false } }),
  order: relationship({ ref: 'TicketOrder.ticket_order', many: false }),
  event: relationship({ ref: 'Event.ticket_event', many: false }),
  line: relationship({ ref: 'TicketOrderLine.ticket_line', many: false }),
  seatInventory: relationship({ ref: 'SeatInventory.ticket_seatInventory', many: false }),
  transferredFrom: relationship({ ref: 'Ticket.ticket_transferredFrom', many: false }),
  ticket_transferredFrom: relationship({ ref: 'Ticket.transferredFrom', many: true }),
  scanEvent_ticket: relationship({ ref: 'ScanEvent.ticket', many: true }),
  ...trackingFields,
 }
});
