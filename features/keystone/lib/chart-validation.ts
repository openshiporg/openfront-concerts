/** Check both old and new parents, including create/connect and inverse nested updates. */
export async function validateChartMutation({ item, resolvedData, context, addValidationError }: any, model: 'chart' | 'section' | 'seat') {
  const check = async (chart: any) => { if (!chart || chart.status !== 'draft') addValidationError('Published seating charts are immutable; create a new version.'); };
  const parentId = (value: any) => value?.connect?.id;
  if (model === 'chart') {
    if (item) await check(await context.prisma.seatingChart.findUnique({ where: { id: item.id } }));
    if (!item && resolvedData.status && resolvedData.status !== 'draft') addValidationError('Create a draft chart, then publish it.');
    return;
  }
  const ids = new Set<string>();
  if (model === 'section') {
    if (item?.chartId) ids.add(item.chartId);
    const id = parentId(resolvedData.chart); if (id) ids.add(id);
  } else {
    const sections = [item?.chartSectionId, parentId(resolvedData.chartSection)].filter(Boolean);
    for (const id of sections) { const section = await context.prisma.chartSection.findUnique({ where: { id } }); if (section?.chartId) ids.add(section.chartId); }
  }
  if (!ids.size) addValidationError('A draft chart parent is required.');
  for (const id of ids) await check(await context.prisma.seatingChart.findUnique({ where: { id } }));
}
