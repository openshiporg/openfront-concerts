import { EventsHome } from '@/features/storefront/screens/EventsHome';
import { homeContent } from '@/features/storefront/lib/content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { extras, venues } = await homeContent();
  return <EventsHome extras={extras} venues={venues} />;
}
