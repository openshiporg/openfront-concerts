import { CalendarDays, Ticket, Handshake, Store, ScanLine, FileSpreadsheet, Building2, Mic2, ReceiptText, Tag, CreditCard, Users, Settings, LucideIcon } from 'lucide-react'

export interface PlatformNavItem {
  title: string
  href: string
  color: string
  description: string
  icon: LucideIcon
  group?: string
  /** Hide the link unless the role holds at least one of these permissions (the page 404s for the rest). */
  requires?: string[]
}

export interface PlatformNavGroup {
  id: string
  title: string
  icon: LucideIcon
  items: PlatformNavItem[]
}

export const platformNavItems: PlatformNavItem[] = [
  { title: 'Events', href: '/platform/events', color: 'blue', description: 'Shows by status with pricing, seating and settlement.', icon: Ticket, group: 'standalone' },
  { title: 'Calendar', href: '/platform/calendar', color: 'purple', description: 'Ranked date holds per venue.', icon: CalendarDays, group: 'standalone' },
  { title: 'Deals', href: '/platform/deals', color: 'indigo', description: 'Artist offers and the deal calculator.', icon: Handshake, group: 'standalone', requires: ['canManageDeals', 'canManageSettlements'] },
  { title: 'Box office', href: '/platform/box-office', color: 'teal', description: 'Find orders, refund and transfer.', icon: Store, group: 'standalone', requires: ['canManageOrders', 'canIssueRefunds'] },
  { title: 'Door scan', href: '/platform/door', color: 'orange', description: 'Gate scanning and live admitted count.', icon: ScanLine, group: 'standalone', requires: ['canScanTickets'] },
  { title: 'Settlements', href: '/platform/settlements', color: 'emerald', description: 'Post-show settlement worksheets and sign-off.', icon: FileSpreadsheet, group: 'standalone', requires: ['canManageSettlements'] },

  { title: 'Venues', href: '/platform/venues', color: 'cyan', description: 'Venues, sections and seating charts.', icon: Building2, group: 'catalog' },
  { title: 'Artists and tours', href: '/platform/artists', color: 'pink', description: 'Talent, agencies and tours.', icon: Mic2, group: 'catalog' },
  { title: 'Promo codes', href: '/platform/promo-codes', color: 'rose', description: 'Promo and presale codes.', icon: Tag, group: 'catalog' },

  { title: 'Orders', href: '/platform/orders', color: 'blue', description: 'All ticket orders.', icon: ReceiptText, group: 'sales', requires: ['canManageOrders', 'canIssueRefunds'] },
  { title: 'Customers', href: '/platform/customers', color: 'slate', description: 'Customers, staff and roles.', icon: Users, group: 'sales', requires: ['canSeeOtherPeople', 'canManagePeople', 'canManageRoles'] },

  { title: 'Payment providers', href: '/platform/payment-providers', color: 'slate', description: 'Configure payment gateways.', icon: CreditCard, group: 'integrations', requires: ['canReadPayments', 'canManagePayments'] },
  { title: 'Settings', href: '/platform/settings', color: 'slate', description: 'Promoter settings and refund threshold.', icon: Settings, group: 'integrations' },
  { title: 'Store', href: '/platform/store', color: 'slate', description: 'Configure store settings, logo, and branding.', icon: Store, group: 'integrations', requires: ['canManageEvents'] },
]

export const platformStandaloneItems = platformNavItems.filter((item) => item.group === 'standalone')

export const platformNavGroups: PlatformNavGroup[] = [
  { id: 'catalog', title: 'Catalog', icon: Building2, items: platformNavItems.filter((i) => i.group === 'catalog') },
  { id: 'sales', title: 'Sales', icon: ReceiptText, items: platformNavItems.filter((i) => i.group === 'sales') },
  { id: 'integrations', title: 'Setup', icon: Settings, items: platformNavItems.filter((i) => i.group === 'integrations') },
]

export function getPlatformNavItemsWithBasePath(basePath: string) {
  return platformNavItems.filter((item) => item.group !== 'standalone').map((item) => ({ ...item, href: `${basePath}${item.href}` }))
}
