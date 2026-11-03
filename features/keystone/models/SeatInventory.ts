import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const SeatInventory = list({
 access: commandAccess,
 
 fields: {
  holdKey: text({ isIndexed: 'unique', db: { isNullable: true } }),
  occupancyKey: text({ isIndexed: 'unique', db: { isNullable: true } }),
  eventSeatKey: text({ isIndexed: 'unique', db: { isNullable: true } }),
  status: select({ type: 'string', options: ['open', 'held', 'sold', 'killed', 'comp', 'reserved_hold'], defaultValue: 'open', access: { update: () => false } }),
  event: relationship({ ref: 'Event.seatInventory_event', many: false }),
  seat: relationship({ ref: 'Seat.seatInventory_seat', many: false }),
  priceLevel: relationship({ ref: 'PriceLevel.seatInventory_priceLevel', many: false }),
  productionHold_seats: relationship({ ref: 'ProductionHold.seats', many: true }),
  inventoryHold_seats: relationship({ ref: 'InventoryHold.seats', many: true }),
  ticket_seatInventory: relationship({ ref: 'Ticket.seatInventory', many: true }),
  ...trackingFields,
 }
});
