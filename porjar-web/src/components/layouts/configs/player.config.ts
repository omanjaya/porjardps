import {
  House,
  Sword,
  Upload,
  Users,
  UserCircle,
  Trophy,
  ChartBar,
  Star,
  CalendarBlank,
  ListBullets,
} from '@phosphor-icons/react'
import type { LayoutConfig } from './types'

export const playerConfig: LayoutConfig = {
  role: 'player',
  roleLabel: 'Pemain',
  baseHref: '/dashboard',
  allowedRoles: [],
  defaultUserLabel: 'Player',
  navItems: [
    { label: 'Dashboard', href: '/dashboard', icon: House },
    { label: 'Turnamen', href: '/dashboard/tournament', icon: Trophy },
    { label: 'Pertandingan', href: '/dashboard/my-matches', icon: Sword },
    { label: 'Kirim Bukti', href: '/dashboard/submit-result', icon: Upload },
    { label: 'Pengajuan', href: '/dashboard/submissions', icon: ListBullets },
    { label: 'Statistik', href: '/dashboard/stats', icon: ChartBar },
    { label: 'Event Saya', href: '/dashboard/events', icon: CalendarBlank },
    { label: 'Poin Saya', href: '/dashboard/points', icon: Star },
    { label: 'Tim Saya', href: '/dashboard/teams', icon: Users },
    { label: 'Profil', href: '/dashboard/profile', icon: UserCircle },
  ],
  bottomNavItems: [
    { label: 'Dashboard', href: '/dashboard', icon: House },
    { label: 'Turnamen', href: '/dashboard/tournament', icon: Trophy },
    { label: 'Kirim', href: '/dashboard/submit-result', icon: Upload },
    { label: 'Statistik', href: '/dashboard/stats', icon: ChartBar },
    { label: 'Profil', href: '/dashboard/profile', icon: UserCircle },
  ],
}
