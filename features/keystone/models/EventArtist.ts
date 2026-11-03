import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const EventArtist = list({
 access: catalogAccess,
 
 fields: {
  position: integer({ defaultValue: 0 }),
  setMinutes: integer({ defaultValue: 0 }),
  setTime: timestamp(),
  billing: select({ type: 'string', options: ['headliner', 'co_headliner', 'support', 'opener'], defaultValue: 'headliner', access: { update: () => false } }),
  event: relationship({ ref: 'Event.eventArtist_event', many: false }),
  artist: relationship({ ref: 'Artist.eventArtist_artist', many: false }),
  offer_eventArtist: relationship({ ref: 'Offer.eventArtist', many: true }),
  ...trackingFields,
 }
});
