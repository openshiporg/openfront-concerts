/**
 * Whether the sidebar should still offer the "get started" onboarding card.
 * It is for an empty promoter account: once onboarding is finished or dismissed,
 * or events already exist (seeded or added by hand), it stays hidden.
 */
export function shouldShowOnboardingCard(input: {
  canManageOnboarding?: boolean | null
  onboardingStatus?: string | null
  eventsCount?: number | null
}): boolean {
  if (!input.canManageOnboarding) return false
  if (input.onboardingStatus === "completed" || input.onboardingStatus === "dismissed") return false
  if (typeof input.eventsCount === "number" && input.eventsCount > 0) return false
  return true
}
