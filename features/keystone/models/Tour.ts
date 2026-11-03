import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Tour = list({
 access: catalogAccess,
 
 fields: {
  name: text({}),
  notes: text({}),
  startAt: timestamp(),
  endAt: timestamp(),
  artist: relationship({ ref: 'Artist.tour_artist', many: false }),
  event_tour: relationship({ ref: 'Event.tour', many: true }),
  ...trackingFields,
 }
});
