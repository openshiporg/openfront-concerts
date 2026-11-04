import { list, graphql } from '@keystone-6/core';
import { text, integer, checkbox, json, select, relationship, timestamp, virtual } from '@keystone-6/core/fields';
import { trackingFields } from './trackingFields';
import { commandAccess, catalogAccessFor, permissions } from '../access';

export const ChartSection = list({
 access: catalogAccessFor('canManageVenues'),
 hooks: { async validate({ operation, item, context, addValidationError }) { if (!item) return; let chart: any = item; chart = await context.prisma.seatingChart.findUnique({where:{id: item.chartId as string}}); if (chart?.status !== 'draft') addValidationError('Published seating charts are immutable; create a new version.'); } },
 fields: {
  name: text({}),
  capacity: integer({ defaultValue: 0 }),
  sort: integer({ defaultValue: 0 }),
  kind: select({ type: 'string', options: ['ga', 'reserved'], defaultValue: 'ga', access: { update: () => false } }),
  chart: relationship({ ref: 'SeatingChart.chartSection_chart', many: false }),
  seat_chartSection: relationship({ ref: 'Seat.chartSection', many: true }),
  priceLevel_sections: relationship({ ref: 'PriceLevel.sections', many: true }),
  ...trackingFields,
 }
});
