import type { UserRole } from '@/types'

export const roleLabels: Record<UserRole, string> = {
  player: 'Player',
  admin: 'Admin',
  superadmin: 'Superadmin',
  coach: 'Guru Pembina',
  referee: 'Wasit',
}

export const roleColors: Record<UserRole, string> = {
  player: 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-300 dark:border-zinc-600',
  admin: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200',
  superadmin: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200',
  coach: 'bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200',
  referee: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 border-purple-200',
}

export const availableRoles: UserRole[] = ['player', 'admin', 'superadmin', 'coach', 'referee']
export const createRoles: UserRole[] = ['player', 'admin', 'coach', 'referee']
export const tingkatOptions = ['SMA', 'SMK', 'SMP']

export type FilterRole = UserRole | 'all' | 'captain'

export interface CreateUserForm {
  full_name: string
  email: string
  password: string
  role: UserRole
  phone: string
  tingkat: string
  nomor_pertandingan: string
}

export interface EditUserForm {
  full_name: string
  email: string
  phone: string
  tingkat: string
  nisn: string
  nomor_pertandingan: string
}

export const emptyCreateForm: CreateUserForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'player',
  phone: '',
  tingkat: '',
  nomor_pertandingan: '',
}

export const emptyEditForm: EditUserForm = {
  full_name: '',
  email: '',
  phone: '',
  tingkat: '',
  nisn: '',
  nomor_pertandingan: '',
}

export interface CredentialData {
  full_name: string
  nisn: string
  school_name: string
  team_name: string
  game_display: string
  member_role: string
  password: string
}
