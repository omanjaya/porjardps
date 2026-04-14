import type { Icon } from '@phosphor-icons/react'

export interface NavItem {
  label: string
  href: string
  icon: Icon
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
