export const money = (cents: number | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);
export const when = (value: string | null | undefined, timeZone = 'America/Los_Angeles') =>
  value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value)) : '';
export const day = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '';
export const label = (value: string | null | undefined) => (value || '').replace(/_/g, ' ');
