import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Artist = list({
 access: catalogAccess,
 
 fields: {
  name: text({}),
  genreTags: text({}),
  agentName: text({}),
  agentEmail: text({}),
  manager: text({}),
  bio: text({}),
  image: text({}),
  socials: json(),
  agency: relationship({ ref: 'Agency.artist_agency', many: false }),
  tour_artist: relationship({ ref: 'Tour.artist', many: true }),
  eventArtist_artist: relationship({ ref: 'EventArtist.artist', many: true }),
  dateHold_artist: relationship({ ref: 'DateHold.artist', many: true }),
  offer_artist: relationship({ ref: 'Offer.artist', many: true }),
  ...trackingFields,
 }
});
