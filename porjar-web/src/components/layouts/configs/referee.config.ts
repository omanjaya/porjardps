import {
  House,
  Sword,
  IdentificationCard,
  Bell,
  UserCircle,
} from '@phosphor-icons/react'
import type { LayoutConfig } from './types'

export const refereeConfig: LayoutConfig = {
  role: 'referee',
  roleLabel: 'Wasit',
  baseHref: '/referee',
  allowedRoles: ['referee', 'admin', 'superadmin'],
  defaultUserLabel: 'Wasit',
  navItems: [
    { label: 'Dashboard', href: '/referee', icon: House },
    { label: 'Pertandingan', href: '/referee/matches', icon: Sword },
    { label: 'Riwayat Kartu', href: '/referee/cards', icon: IdentificationCard },
    { label: 'Notifikasi', href: '/referee/notifications', icon: Bell },
    { label: 'Profil', href: '/referee/profile', icon: UserCircle },
  ],
}
