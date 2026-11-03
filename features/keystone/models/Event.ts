import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Event = list({
 access: catalogAccess,
 
 fields: {
  title: text({}),
  presaleCode: text({ access: { read: () => false, create: () => false, update: () => false } }),
  image: text({}),
  description: text({}),
  isCoPro: checkbox({ defaultValue: false }),
  allowReentry: checkbox({ defaultValue: false }),
  doorsAt: timestamp(),
  showAt: timestamp(),
  curfewAt: timestamp(),
  announceAt: timestamp(),
  onSaleAt: timestamp(),
  presaleAt: timestamp(),
  refundWindowEndsAt: timestamp(),
  status: select({ type: 'string', options: ['hold', 'announced', 'presale', 'on_sale', 'sold_out', 'doors', 'in_progress', 'completed', 'settling', 'settled', 'cancelled', 'postponed'], defaultValue: 'hold', access: { update: () => false } }),
  ageRestriction: select({ type: 'string', options: ['all_ages', '16', '18', '21'], defaultValue: 'all_ages', access: { update: () => false } }),
  venue: relationship({ ref: 'Venue.event_venue', many: false }),
  seatingChart: relationship({ ref: 'SeatingChart.event_seatingChart', many: false }),
  tour: relationship({ ref: 'Tour.event_tour', many: false }),
  promoter: relationship({ ref: 'User.event_promoter', many: false }),
  eventArtist_event: relationship({ ref: 'EventArtist.event', many: true }),
  dateHold_event: relationship({ ref: 'DateHold.event', many: true }),
  offer_event: relationship({ ref: 'Offer.event', many: true }),
  eventExpense_event: relationship({ ref: 'EventExpense.event', many: true }),
  priceLevel_event: relationship({ ref: 'PriceLevel.event', many: true }),
  seatInventory_event: relationship({ ref: 'SeatInventory.event', many: true }),
  productionHold_event: relationship({ ref: 'ProductionHold.event', many: true }),
  inventoryHold_event: relationship({ ref: 'InventoryHold.event', many: true }),
  promoCode_event: relationship({ ref: 'PromoCode.event', many: true }),
  ticketOrder_event: relationship({ ref: 'TicketOrder.event', many: true }),
  ticket_event: relationship({ ref: 'Ticket.event', many: true }),
  scanEvent_event: relationship({ ref: 'ScanEvent.event', many: true }),
  merchSales_event: relationship({ ref: 'MerchSales.event', many: true }),
  barSales_event: relationship({ ref: 'BarSales.event', many: true }),
  settlement_event: relationship({ ref: 'Settlement.event', many: true }),
  sold: virtual({ field: graphql.field({ type: graphql.Int, async resolve(item, args, context) { return context.prisma.seatInventory.count({ where: { eventId: item.id, ...{status: 'sold'} } }); } }) }),
  held: virtual({ field: graphql.field({ type: graphql.Int, async resolve(item, args, context) { return context.prisma.seatInventory.count({ where: { eventId: item.id, ...{status: 'held'} } }); } }) }),
  kills: virtual({ field: graphql.field({ type: graphql.Int, async resolve(item, args, context) { return context.prisma.seatInventory.count({ where: { eventId: item.id, ...{status: 'killed'} } }); } }) }),
  gross: virtual({ field: graphql.field({ type: graphql.Int, async resolve(item, args, context) { const result = await context.prisma.ticketOrder.aggregate({ where: { eventId: item.id, status: 'paid' }, _sum: { totalCents: true } }); return result._sum.totalCents ?? 0; } }) }),
  open: virtual({ field: graphql.field({ type: graphql.Int, async resolve(item, args, context) { const levels = await context.prisma.priceLevel.findMany({ where: { eventId: item.id } }); return levels.reduce((n: number, l: { capacity: number; sold: number; held: number; productionHeld: number }) => n + l.capacity - l.sold - l.held - l.productionHeld, 0); } }) }),
  ...trackingFields,
 }
});
