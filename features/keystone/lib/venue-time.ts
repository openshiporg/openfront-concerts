/** Date holds are whole calendar days, stored as midnight UTC of that day. */
export function holdDay(value: string | Date | null | undefined) {
  const raw = value instanceof Date ? value.toISOString() : String(value || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) throw new Error('Valid date required');
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  if (Number.isNaN(+date) || date.toISOString().slice(0, 10) !== match[0]) throw new Error('Valid date required');
  return date.toISOString();
}

/** Wall-clock HH:MM on a day at the venue, as an instant. Handles DST by re-checking the zone offset. */
export function zonedDateTime(day: string, time: string, timeZone: string) {
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ''));
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Time must be HH:MM');
  const wall = Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), +t[1], +t[2]);
  let guess = wall - offsetMs(wall, timeZone);
  guess = wall - offsetMs(guess, timeZone);
  return new Date(guess);
}

function offsetMs(instant: number, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}
