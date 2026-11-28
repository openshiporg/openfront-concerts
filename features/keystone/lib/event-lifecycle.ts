/** Explicit operator transitions; publication, cancellation and settlement retain their own commands. */
export const eventTransitions: Record<string, readonly string[]> = {
  announced: ['presale', 'on_sale'],
  presale: ['on_sale'],
  on_sale: ['sold_out', 'doors', 'completed'],
  sold_out: ['on_sale', 'doors', 'completed'],
  doors: ['in_progress'],
  in_progress: ['completed'],
  postponed: ['announced'],
};
export function assertEventTransition(current: string, next: string, reason?: string, showAt?: Date | string | null, now: Date = new Date()) {
  if (!eventTransitions[current]?.includes(next)) throw new Error(`Cannot move event from ${current} to ${next}`);
  // Doors open on show day, never for a past or far-future date; a show completes only after it starts.
  const at = showAt ? new Date(showAt).getTime() : NaN;
  if (Number.isFinite(at)) {
    const hours = (at - now.getTime()) / 3600_000;
    if (next === 'doors' && (hours > 12 || hours < -12)) throw new Error(hours > 0 ? 'Doors open within 12 hours of the show' : 'This show has passed; complete it instead of opening doors');
    if (next === 'completed' && hours > 0) throw new Error('A show can be completed only after it starts');
  }
  // A show whose doors were never opened in the system is closed out directly once it is over, so it can be settled.
  if (next === 'completed' && current !== 'in_progress' && !(Number.isFinite(at) && at < now.getTime())) throw new Error('Open doors and start the show first');
  if (current === 'postponed' && !reason?.trim()) throw new Error('Resumption reason required');
}
export const eventTransitionLabels: Record<string, string> = {
  presale: 'Start presale', on_sale: 'Open sales', sold_out: 'Mark sold out', doors: 'Open doors', in_progress: 'Start show', completed: 'Complete show', announced: 'Resume announcement',
};
/** The steps to offer for a show right now: no doors for a date outside the door window, direct completion only once the show is over. */
export function availableTransitions(status: string, showAt?: Date | string | null, now: Date = new Date()): string[] {
  const at = showAt ? new Date(showAt).getTime() : NaN;
  const hours = Number.isFinite(at) ? (at - now.getTime()) / 3600_000 : NaN;
  return (eventTransitions[status] || []).filter((next) => {
    if (next === 'doors') return !Number.isFinite(hours) || (hours <= 12 && hours >= -12);
    if (next === 'completed') return status === 'in_progress' ? !(hours > 0) : hours < 0;
    return true;
  });
}
