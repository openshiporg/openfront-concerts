import type { GraphQLClient } from "graphql-request";

const UNIQUE: Record<string, (row: any) => unknown> = {
  roles: (r) => r.name, venues: (r) => r.name, agencies: (r) => r.name, artists: (r) => r.name,
  tours: (r) => r.name, events: (r) => r.title, promoCodes: (r) => r.code,
  dateHolds: (r) => `${r.venue}:${r.days}:${r.rank}`, paymentProviders: (r) => r.code,
};

export function validateConcertsSeed(data: any) {
  if (!data?.storeInfo?.name || !Array.isArray(data.venues) || !data.venues.length || !Array.isArray(data.events) || !data.events.length) throw new Error("Setup requires promoter settings, venues and events");
  for (const [section, key] of Object.entries(UNIQUE)) {
    if (!Array.isArray(data[section])) throw new Error(`Setup ${section} must be a list`);
    const keys = data[section].map(key);
    if (keys.some((k: unknown) => typeof k !== "string" || !k.trim()) || new Set(keys).size !== keys.length) throw new Error(`Setup ${section} contains missing or duplicate names`);
  }
  const names = (section: string) => new Set<string>(data[section].map((r: any) => r.name));
  for (const venue of data.venues) if (!venue.chart?.sections?.length) throw new Error(`Venue ${venue.name} requires a seating chart`);
  for (const artist of data.artists) if (artist.agency && !names("agencies").has(artist.agency)) throw new Error(`Missing agency for ${artist.name}`);
  for (const event of data.events) {
    if (!names("venues").has(event.venue)) throw new Error(`Missing venue for ${event.title}`);
    if (!names("artists").has(event.artist)) throw new Error(`Missing artist for ${event.title}`);
    for (const level of event.levels) if (!Number.isInteger(level.priceCents) || level.priceCents < 0) throw new Error(`Invalid price for ${event.title}`);
  }
}

export async function requestSeedRecord(client: Pick<GraphQLClient, "request">, section: string, data: any) {
  const result: any = await client.request(`mutation SeedConcerts($section: String!, $data: JSON!) { seedConcerts(section: $section, data: $data) }`, { section, data });
  const record = result?.seedConcerts;
  if (!record?.id) throw new Error(`${section} setup did not return a persisted record`);
  return record as { id: string };
}

export async function runSeedPhases(start: () => Promise<{ success: boolean; error?: string }>, phases: Array<() => Promise<unknown>>, complete: () => Promise<{ success: boolean; error?: string }>) {
  const started = await start();
  if (!started.success) throw new Error(started.error || "Could not record setup progress");
  for (const phase of phases) await phase();
  const completed = await complete();
  if (!completed.success) throw new Error(completed.error || "Could not complete setup");
}
