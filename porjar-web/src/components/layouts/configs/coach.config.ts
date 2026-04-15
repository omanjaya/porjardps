import {
  House,
  Users,
  Trophy,
  UserCircle,
  GraduationCap,
  Bell,
} from '@phosphor-icons/react'
import type { LayoutConfig } from './types'

export const coachConfig: LayoutConfig = {
  role: 'coach',
  roleLabel: 'Guru Pembina',
  baseHref: '/coach',
  allowedRoles: ['coach', 'admin', 'superadmin'],
  defaultUserLabel: 'Guru Pembina',
  navItems: [
    { label: 'Dashboard', href: '/coach', icon: House },
    { label: 'Tim Saya', href: '/coach/teams', icon: Users },
    { label: 'Hasil', href: '/coach/results', icon: Trophy },
    { label: 'Sekolah', href: '/coach/school', icon: GraduationCap },
    { label: 'Notifikasi', href: '/coach/notifications', icon: Bell },
    { label: 'Profil', href: '/coach/profile', icon: UserCircle },
  ],
}
