import { SECTION_TYPES } from '../config/templates';

export function getItemsFromJsonData(jsonData: any, sectionType: string): string[] {
  if (!jsonData) return [];
  if (sectionType === 'storeInfo') return [jsonData.storeInfo?.name || 'Promoter Settings'];
  const rows = jsonData[sectionType];
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => row.title || row.name || row.code || (row.venue ? `${row.venue} #${row.rank}` : 'Unnamed'));
}

/** Both templates run the same pipeline over filtered sections. */
export function getSeedForTemplate(template: 'full' | 'minimal' | 'custom', seedData: any) {
  if (template === 'full') return seedData;
  const keep = <T,>(rows: T[] | undefined, pick: (row: T) => boolean) => (rows || []).filter(pick);
  const venue = seedData.venues.find((v: any) => v.name === 'The Foundry');
  const event = { ...seedData.events.find((e: any) => e.key === 'u10'), support: [], productionHolds: [] };
  return {
    storeInfo: seedData.storeInfo,
    roles: seedData.roles,
    paymentProviders: seedData.paymentProviders,
    venues: [venue],
    agencies: keep(seedData.agencies, (a: any) => a.name === 'Brightside Talent'),
    artists: keep(seedData.artists, (a: any) => a.name === event.artist),
    tours: [],
    events: [event],
    dateHolds: [],
    promoCodes: [],
  };
}
export const emptyItems = () => Object.fromEntries(SECTION_TYPES.map((t) => [t, [] as string[]]));
