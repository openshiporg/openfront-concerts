import type { MetadataRoute } from 'next';
import { listedShows } from '@/features/storefront/lib/content';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  const { shows } = await listedShows();
  return [{ url: `${base}/`, changeFrequency: 'daily', priority: 1 }, ...shows.map((s) => ({ url: `${base}/events/${s.id}`, changeFrequency: 'daily' as const, priority: 0.8 }))];
}
