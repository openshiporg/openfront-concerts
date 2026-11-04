/** Explicit operator transitions; publication, cancellation and settlement retain their own commands. */
export const eventTransitions: Record<string, readonly string[]> = {
  announced: ['presale', 'on_sale'],
  presale: ['on_sale'],
  on_sale: ['sold_out', 'doors'],
  sold_out: ['on_sale', 'doors'],
  doors: ['in_progress'],
  in_progress: ['completed'],
  postponed: ['announced'],
};
export function assertEventTransition(current: string, next: string, reason?: string) {
  if (!eventTransitions[current]?.includes(next)) throw new Error(`Cannot move event from ${current} to ${next}`);
  if (current === 'postponed' && !reason?.trim()) throw new Error('Resumption reason required');
}
export const eventTransitionLabels: Record<string, string> = {
  presale: 'Start presale', on_sale: 'Open sales', sold_out: 'Mark sold out', doors: 'Open doors', in_progress: 'Start show', completed: 'Complete show', announced: 'Resume announcement',
};
