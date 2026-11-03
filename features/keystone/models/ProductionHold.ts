import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const ProductionHold = list({
 access: commandAccess,
 
 fields: {
  quantity: integer({ defaultValue: 0 }),
  releaseAt: timestamp(),
  holdType: select({ type: 'string', options: ['artist', 'promoter', 'production', 'sponsor', 'ada'], defaultValue: 'artist', access: { update: () => false } }),
  status: select({ type: 'string', options: ['active', 'released'], defaultValue: 'active', access: { update: () => false } }),
  event: relationship({ ref: 'Event.productionHold_event', many: false }),
  priceLevel: relationship({ ref: 'PriceLevel.productionHold_priceLevel', many: false }),
  seats: relationship({ ref: 'SeatInventory.productionHold_seats', many: true }),
  ...trackingFields,
 }
});
