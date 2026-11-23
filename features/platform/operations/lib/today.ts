/** Venue-local calendar day, not the server's timezone. */
export function isVenueToday(showAt: string | null | undefined, timezone: string | null | undefined, now: Date): boolean {
  if (!showAt) return false;
  const show = new Date(showAt);
  if (!Number.isFinite(show.getTime())) return false;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  return day.format(show) === day.format(now);
}
