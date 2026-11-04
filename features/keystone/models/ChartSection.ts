import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { validateChartMutation } from '../lib/chart-validation';
import { commandAccess, catalogAccessFor, permissions } from '../access';

export const ChartSection = list({
 access: catalogAccessFor('canManageVenues'),
 hooks: { validate: args => validateChartMutation(args, 'section') },
 fields: {
  name: text({}),
  capacity: integer({ defaultValue: 0 }),
  sort: integer({ defaultValue: 0 }),
  kind: select({ type: 'string', options: ['ga', 'reserved'], defaultValue: 'ga', access: { update: () => false } }),
  chart: relationship({ ref: 'SeatingChart.chartSection_chart', many: false }),
  seat_chartSection: relationship({ ref: 'Seat.chartSection', many: true, access: { create: () => false, update: () => false } }),
  priceLevel_sections: relationship({ ref: 'PriceLevel.sections', many: true, access: { create: () => false, update: () => false } }),
  ...trackingFields,
 }
});
