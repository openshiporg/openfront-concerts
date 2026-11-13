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
/** What a refused permission lets you do, in words staff read (never the raw key). */
const permissionActions: Record<Permission, string> = {
  canSeeOtherPeople: 'see other people', canEditOtherPeople: 'edit other people', canManagePeople: 'manage people', canManageRoles: 'manage roles',
  canAccessDashboard: 'use the dashboard', canManageOnboarding: 'run store setup', canManagePayments: 'manage payments', canReadPayments: 'view payments',
  canIssueRefunds: 'issue refunds', canReadAudit: 'view the audit log', canManageEvents: 'manage events', canManageDeals: 'manage deals',
  canManageInventory: 'manage inventory', canManageOrders: 'manage orders', canScanTickets: 'scan tickets', canManageSettlements: 'manage settlements',
  canApproveAdjustments: 'approve adjustments', canManageVenues: 'manage venues', canManageArtists: 'manage artists',
};
export const permissionRefusal = (permission: Permission) => `Your role does not allow you to ${permissionActions[permission]}.`;
export const commandAccess = { operation: { query: permissions.canAccessDashboard, create: () => false, update: () => false, delete: () => false } };
export const catalogAccessFor = (permission: Permission) => ({ operation: { query: permissions.canAccessDashboard, create: permissions[permission], update: permissions[permission], delete: () => false } });
/** Read-only list (writes go through commands): visible only to roles holding at least one of the permissions. */
export const readAccess = (...needed: Permission[]) => ({ operation: { query: ({ session }: AccessArgs) => needed.some(p => session?.data.role?.[p] === true), create: () => false, update: () => false, delete: () => false } });
export const catalogAccess = catalogAccessFor('canManageEvents');
export const rules = {
  canReadPeople: ({ session }: AccessArgs) => !session ? false : session.data.role?.canSeeOtherPeople ? true : { id: { equals: session.itemId } },
  canUpdatePeople: ({ session }: AccessArgs) => !session ? false : session.data.role?.canEditOtherPeople ? true : { id: { equals: session.itemId } },
};
/** Ticket revenue (Event.gross): order, refund, settlement, deal, event and payment staff; not door staff. */
export const grossReaders: Permission[] = ['canManageOrders', 'canIssueRefunds', 'canManageSettlements', 'canManageDeals', 'canManageEvents', 'canReadPayments'];
export const canReadGross = ({ session }: AccessArgs) => grossReaders.some(p => session?.data.role?.[p] === true);
