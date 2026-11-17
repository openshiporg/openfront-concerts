import { keystoneContext } from '@/features/keystone/context';

export type EventExtra = { artists: { name: string; genre: string; billing: string }[] };
export type PublicVenue = { id: string; name: string; city: string; address: string; capacity: number; shows: number };

type Row = {
  id: string;
  venue: { id: string; name: string; city: string; address: string; capacity: number | null } | null;
  eventArtist_event: { billing: string | null; artist: { name: string; genreTags: string } | null }[];
};

const LISTED = ['announced', 'presale', 'on_sale', 'sold_out', 'postponed'];

/** Public facts the home page shows beside each listed event: who plays and where. Server only, fixed fields. */
export async function homeContent(): Promise<{ extras: Record<string, EventExtra>; venues: PublicVenue[] }> {
  try {
    const rows = (await keystoneContext.sudo().query.Event.findMany({
      where: { status: { in: LISTED } },
      orderBy: [{ showAt: 'asc' }],
      take: 100,
      query: 'id venue { id name city address capacity } eventArtist_event(orderBy: [{ position: asc }]) { billing artist { name genreTags } }',
    })) as readonly Row[];
    const extras: Record<string, EventExtra> = {};
    const venues = new Map<string, PublicVenue>();
    for (const r of rows) {
      extras[r.id] = { artists: r.eventArtist_event.filter((a) => a.artist?.name).map((a) => ({ name: a.artist!.name, genre: a.artist!.genreTags || '', billing: a.billing || '' })) };
      if (!r.venue) continue;
      const v = venues.get(r.venue.id);
      if (v) v.shows += 1;
      else venues.set(r.venue.id, { id: r.venue.id, name: r.venue.name, city: r.venue.city || '', address: r.venue.address || '', capacity: r.venue.capacity || 0, shows: 1 });
    }
    return { extras, venues: [...venues.values()].sort((a, b) => b.shows - a.shows) };
  } catch (error) {
    console.error('Storefront home content failed:', error instanceof Error ? error.message : 'unknown');
    return { extras: {}, venues: [] };
  }
}
