import { list } from '@keystone-6/core'
import { allOperations, denyAll } from '@keystone-6/core/access'
import { checkbox, password, relationship, text, select, timestamp } from '@keystone-6/core/fields'
import { trackingFields } from './trackingFields'

import { isSignedIn, permissions, rules } from '../access'
import type { Session } from '../access'

const relationsManagedBy = (refs: Record<string, string>) => Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, relationship({ ref, many: true, access: { create: permissions.canManagePeople, update: permissions.canManagePeople } })]))

export const User = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
      create: (args) => {
        // Customers create their own account on the storefront. It carries no role, so it opens nothing in the dashboard.
        // A venue that wants staff-created accounts only sets PUBLIC_SIGNUPS_ALLOWED=false.
        if (process.env.PUBLIC_SIGNUPS_ALLOWED !== 'false') {
          return true;
        }
        return permissions.canManagePeople(args);
      },
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
    },
  },
  hooks: {
    // A changed address has not been confirmed yet, so it stops matching guest orders until it is.
    resolveInput: ({ operation, resolvedData, item }) => {
      if (operation === 'update' && typeof resolvedData.email === 'string' && resolvedData.email !== (item as any)?.email) return { ...resolvedData, emailVerifiedAt: null };
      return resolvedData;
    },
  },
  ui: {
    hideCreate: args => !permissions.canManagePeople(args),
    hideDelete: args => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ['name', 'email', 'role'],
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        // canEditOtherPeople can edit other people
        if (session?.data.role?.canEditOtherPeople) return 'edit'

        // edit themselves
        if (session?.itemId === item?.id) return 'edit'

        // else, default all fields to read mode
        return 'read'
      },
    },
  },
  fields: {
    name: text({
      validation: {
        isRequired: true,
      },
    }),
    email: text({
      isFilterable: false,
      isOrderable: false,
      isIndexed: 'unique',
      validation: {
        isRequired: true,
      },
    }),
    password: password({
      access: {
        read: denyAll,
        update: ({ session, item }) =>
          permissions.canManagePeople({ session }) || session?.itemId === item.id,
      },
      validation: { isRequired: true },
    }),
    role: relationship({
      ref: 'Role.assignedTo',
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople,
      },
      ui: {
        itemView: {
          fieldMode: args => (permissions.canManagePeople(args) ? 'edit' : 'read'),
        },
      },
    }),
    // Set when the person opens the confirmation link we emailed; orders bought with that address then show in their account.
    emailVerifiedAt: timestamp({ access: { create: denyAll, update: denyAll }, ui: { createView: { fieldMode: 'hidden' }, itemView: { fieldMode: 'read' } } }),
    emailConfirmationSentAt: timestamp({ access: { read: denyAll, create: denyAll, update: denyAll }, ui: { createView: { fieldMode: 'hidden' }, itemView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } } }),
    onboardingStatus: select({ options: ['not_started', 'in_progress', 'completed', 'dismissed'], defaultValue: 'not_started' }),
    // Public sign-up cannot attach orders, holds or settings to the new account; checkout and email confirmation do that.
    ...relationsManagedBy({
      event_promoter: 'Event.promoter', inventoryHold_customer: 'InventoryHold.customer', ticketOrder_customer: 'TicketOrder.customer',
      scanEvent_scannedBy: 'ScanEvent.scannedBy', settlementLine_approvedBy: 'SettlementLine.approvedBy', auditEvent_actor: 'AuditEvent.actor', storeSettings_manager: 'StoreSettings.manager',
    }),
    ...trackingFields,
  },
});