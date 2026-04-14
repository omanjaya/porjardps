import { Sword, ShieldStar, Crosshair, Target, SoccerBall } from '@phosphor-icons/react'

export const RED = '#C41E2A'

export const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  ongoing: { label: 'Sedang Berlangsung', class: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400 border-green-200 dark:border-green-800' },
  published: { label: 'Pendaftaran Dibuka', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  completed: { label: 'Selesai', class: 'bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400 border-stone-200 dark:border-zinc-700' },
  draft: { label: 'Segera Hadir', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  archived: { label: 'Arsip', class: 'bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-500 border-stone-200 dark:border-zinc-700' },
}

// TODO: move to EventSettings backend when available
export interface LandingContact {
  name: string
  phone: string
  role?: string
}

export const LANDING_CONTACTS: LandingContact[] = [
  { name: 'Bagus Eka', phone: '+62 878-6156-9479' },
  { name: 'Arik', phone: '+62 877-6038-3825' },
  { name: 'Geni', phone: '+62 813-3960-0701' },
]

export const GAME_ICONS = [
  { name: 'Honor of Kings', icon: Sword, color: '#d97706' },
  { name: 'Mobile Legends', icon: ShieldStar, color: '#2563eb' },
  { name: 'Free Fire', icon: Crosshair, color: '#ea580c' },
  { name: 'PUBG Mobile', icon: Target, color: '#ca8a04' },
  { name: 'eFootball', icon: SoccerBall, color: '#16a34a' },
]
