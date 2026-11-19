import { EventsHome } from '@/features/storefront/screens/EventsHome';
import { listedShows } from '@/features/storefront/lib/content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return <EventsHome {...(await listedShows())} />;
}
