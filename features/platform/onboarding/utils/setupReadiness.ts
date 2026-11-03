/** Compares requested setup values with the values actually returned by the persistence boundary. */
export function findSavedSettingsMismatches(requested: Record<string, unknown>, saved: Record<string, unknown> | null | undefined) {
  return Object.keys(requested).filter((field) => JSON.stringify(requested[field]) !== JSON.stringify(saved?.[field]));
}
