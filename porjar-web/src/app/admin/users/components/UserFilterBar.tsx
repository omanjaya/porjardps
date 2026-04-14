'use client'

import { Input } from '@/components/ui/input'
import type { UserRole } from '@/types'
import { availableRoles, roleLabels, type FilterRole } from '../constants'

interface UserFilterBarProps {
  filterRole: FilterRole
  onFilterRoleChange: (role: FilterRole) => void
  search: string
  onSearchChange: (value: string) => void
}

export function UserFilterBar({ filterRole, onFilterRoleChange, search, onSearchChange }: UserFilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-1">
        {(['all', ...availableRoles, 'captain'] as const).map((role) => (
          <button
            key={role}
            onClick={() => onFilterRoleChange(role)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterRole === role
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800'
            }`}
          >
            {role === 'all' ? 'Semua' : role === 'captain' ? 'Captain' : roleLabels[role as UserRole]}
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
