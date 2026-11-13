export const permissionNames = [
  'canSeeOtherPeople', 'canEditOtherPeople', 'canManagePeople', 'canManageRoles',
  'canAccessDashboard', 'canManageOnboarding', 'canManagePayments', 'canReadPayments',
  'canIssueRefunds', 'canReadAudit', 'canManageEvents', 'canManageDeals',
  'canManageInventory', 'canManageOrders', 'canScanTickets', 'canManageSettlements',
  'canApproveAdjustments', 'canManageVenues', 'canManageArtists',
] as const;
export type Permission = typeof permissionNames[number];
export type Session = { itemId: string; listKey: string; data: { name: string; email?: string; role?: { id: string; name: string } & Record<Permission, boolean> } };
type AccessArgs = { session?: Session };
export const isSignedIn = ({ session }: AccessArgs) => Boolean(session);
export const permissions = Object.fromEntries(permissionNames.map(name => [name, ({ session }: AccessArgs) => session?.data.role?.[name] === true])) as Record<Permission, (args: AccessArgs) => boolean>;
export const commandAccess = { operation: { query: permissions.canAccessDashboard, create: () => false, update: () => false, delete: () => false } };
export const catalogAccessFor = (permission: Permission) => ({ operation: { query: permissions.canAccessDashboard, create: permissions[permission], update: permissions[permission], delete: () => false } });
/** Read-only list (writes go through commands): visible only to roles holding at least one of the permissions. */
export const readAccess = (...needed: Permission[]) => ({ operation: { query: ({ session }: AccessArgs) => needed.some(p => session?.data.role?.[p] === true), create: () => false, update: () => false, delete: () => false } });
export const catalogAccess = catalogAccessFor('canManageEvents');
export const rules = {
  canReadPeople: ({ session }: AccessArgs) => !session ? false : session.data.role?.canSeeOtherPeople ? true : { id: { equals: session.itemId } },
  canUpdatePeople: ({ session }: AccessArgs) => !session ? false : session.data.role?.canEditOtherPeople ? true : { id: { equals: session.itemId } },
};
