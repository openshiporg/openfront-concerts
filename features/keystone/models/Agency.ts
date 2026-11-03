import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccess, permissions } from '../access';

export const Agency = list({
 access: catalogAccess,
 
 fields: {
  name: text({}),
  contacts: json(),
  artist_agency: relationship({ ref: 'Artist.agency', many: true }),
  dateHold_agency: relationship({ ref: 'DateHold.agency', many: true }),
  ...trackingFields,
 }
});
