import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { validateChartMutation } from '../lib/chart-validation';
import { commandAccess, catalogAccessFor, permissions } from '../access';

export const Seat = list({
 access: catalogAccessFor('canManageVenues'),
 hooks: { validate: args => validateChartMutation(args, 'seat') },
 fields: {
  row: text({}),
  number: text({}),
  label: text({}),
  x: integer({ defaultValue: 0 }),
  y: integer({ defaultValue: 0 }),
  accessible: checkbox({ defaultValue: false }),
  companion: checkbox({ defaultValue: false }),
  obstructed: checkbox({ defaultValue: false }),
  status: select({ type: 'string', options: ['sellable', 'killed'], defaultValue: 'sellable', access: { update: () => false } }),
  chartSection: relationship({ ref: 'ChartSection.seat_chartSection', many: false }),
  seatInventory_seat: relationship({ ref: 'SeatInventory.seat', many: true }),
  ...trackingFields,
 }
});
