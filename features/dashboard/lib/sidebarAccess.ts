/**
 * Sidebar filtering from capabilities the session already has: the role's
 * canAccessDashboard flag and Keystone's per-session list `isHidden` from admin meta.
 * Plain module: no 'use server' / 'use client', no @/ imports.
 */

type SidebarList = { path: string; isHidden?: boolean | null }
type SidebarUser = { role?: { canAccessDashboard?: boolean | null } | null } | null | undefined

/** Only an explicit false hides navigation; an unknown user is left to the middleware. */
export function canUseDashboardNav(user: SidebarUser) {
  return user?.role?.canAccessDashboard !== false
}

export function visibleSidebarLists<T extends SidebarList>(lists: T[], user: SidebarUser): T[] {
  if (!canUseDashboardNav(user)) return []
  return lists.filter((list) => !list.isHidden)
}

/**
 * A platform page whose first segment is a list path follows that list's visibility;
 * pages that are not tied to one list stay visible to dashboard users.
 */
export function visiblePlatformItems<T extends { href: string }>(
  items: T[],
  lists: SidebarList[],
  user: SidebarUser
): T[] {
  if (!canUseDashboardNav(user)) return []
  const hiddenPaths = new Set(lists.filter((list) => list.isHidden).map((list) => list.path))
  return items.filter((item) => {
    const slug = item.href.split('/platform/')[1]?.split(/[/?#]/)[0]
    return !slug || !hiddenPaths.has(slug)
  })
}

/**
 * Items that name the permissions they need (`requires`) are hidden from a role that holds none of them.
 * A user whose permissions are unknown keeps the item; the page itself still refuses with a 404.
 */
export function visibleByPermission<T extends { requires?: string[] }>(
  items: T[],
  user: { role?: Record<string, unknown> | null } | null | undefined
): T[] {
  const role = user?.role
  if (!role) return items
  return items.filter((item) => !item.requires?.length || item.requires.some((p) => role[p] === true))
}
