const TZ = 'America/Los_Angeles';
const fmt = (iso: string, tz: string | null | undefined, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: tz || TZ }).format(new Date(iso));

export const usd = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
/** "Mon, Nov 16" */
export const day = (iso: string, tz?: string | null) => fmt(iso, tz, { weekday: 'short', month: 'short', day: 'numeric' });
/** "8:00 PM" */
export const clock = (iso: string, tz?: string | null) => fmt(iso, tz, { hour: 'numeric', minute: '2-digit' });
export const dayParts = (iso: string, tz?: string | null) => ({ weekday: fmt(iso, tz, { weekday: 'short' }), month: fmt(iso, tz, { month: 'short' }), date: fmt(iso, tz, { day: 'numeric' }) });
export const ages = (a?: string | null) => (!a || a === 'all_ages' ? 'All ages' : `${a}+`);
export const words = (s?: string | null) => { const t = String(s || '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
export const listOf = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
