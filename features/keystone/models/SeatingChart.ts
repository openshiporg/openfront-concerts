import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccessFor, permissions } from '../access';

export const SeatingChart = list({
 access: catalogAccessFor('canManageVenues'),
 hooks: { async validate({ operation, item, context, addValidationError }) { if (!item) return; let chart: any = item;  if (chart?.status !== 'draft') addValidationError('Published seating charts are immutable; create a new version.'); } },
 fields: {
  name: text({}),
  version: integer({ defaultValue: 1 }),
  status: select({ type: 'string', options: ['draft', 'published', 'retired'], defaultValue: 'draft', access: { update: () => false } }),
  venue: relationship({ ref: 'Venue.seatingChart_venue', many: false }),
  chartSection_chart: relationship({ ref: 'ChartSection.chart', many: true }),
  event_seatingChart: relationship({ ref: 'Event.seatingChart', many: true }),
  ...trackingFields,
 }
});
