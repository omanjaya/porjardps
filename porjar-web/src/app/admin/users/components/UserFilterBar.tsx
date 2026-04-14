'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { FilterRole } from '../constants'

interface UserFilterBarProps {
  filterRole: FilterRole
  onFilterRoleChange: (role: FilterRole) => void
  search: string
  onSearchChange: (value: string) => void
}

const roles: { value: FilterRole; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'player', label: 'Pemain' },
  { value: 'coach', label: 'Guru' },
  { value: 'referee', label: 'Wasit' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'captain', label: 'Captain' },
]

export function UserFilterBar({ filterRole, onFilterRoleChange, search, onSearchChange }: UserFilterBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => onFilterRoleChange(r.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-all',
              filterRole === r.value
                ? 'bg-esi-red text-white shadow-sm'
                : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700 hover:text-stone-900 dark:hover:text-zinc-100',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <Input
        placeholder="Cari nama atau email..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full sm:w-56 bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red"
        aria-label="Cari pengguna"
      />
    </div>
  )
}
