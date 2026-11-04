import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccessFor, permissions } from '../access';

export const Tour = list({
 access: catalogAccessFor('canManageArtists'),
 
 fields: {
  name: text({}),
  notes: text({}),
  startAt: timestamp(),
  endAt: timestamp(),
  artist: relationship({ ref: 'Artist.tour_artist', many: false }),
  event_tour: relationship({ ref: 'Event.tour', many: true }),
 promoCodes: relationship({ ref: 'PromoCode.tour', many: true }),
  ...trackingFields,
 }
});
