import type { Icon } from '@phosphor-icons/react'

export interface NavItem {
  label: string
  href: string
  icon: Icon
  /** Section header label — rendered as a divider above this item when it changes */
  section?: string
  /** Only visible to superadmin users */
  superadminOnly?: boolean
}

export interface LayoutConfig {
  role: 'admin' | 'coach' | 'player' | 'referee'
  roleLabel: string
  baseHref: string
  navItems: NavItem[]
  bottomNavItems?: NavItem[]
  allowedRoles: string[]
  defaultUserLabel: string
}
