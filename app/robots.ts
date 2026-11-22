import type { MetadataRoute } from 'next';

const base = () => (process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/account', '/orders', '/api', '/oauth'] }], sitemap: base() ? `${base()}/sitemap.xml` : undefined };
}
