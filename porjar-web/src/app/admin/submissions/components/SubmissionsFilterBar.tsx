'use client'

import { Funnel, MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { FilterTab } from './SubmissionStatusBadge'

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'all', label: 'Semua' },
]

export function SubmissionsFilterBar({
  filter,
  setFilter,
  search,
  setSearch,
  gameFilter,
  setGameFilter,
  gameNames,
  pendingCount,
}: {
  filter: FilterTab
  setFilter: (value: FilterTab) => void
  search: string
  setSearch: (value: string) => void
  gameFilter: string
  setGameFilter: (value: string) => void
  gameNames: string[]
  pendingCount: number
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-zinc-700 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === tab.value
                ? 'bg-esi-red/10 text-esi-red'
                : 'text-esi-muted hover:text-esi-text hover:bg-esi-bg'
            )}
          >
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-esi-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-esi-muted" />
            <Input
              placeholder="Cari tim atau pemain..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-48 pl-9 text-sm border-stone-200 dark:border-zinc-700 focus:border-esi-red focus:ring-esi-red/20"
            />
          </div>
        </div>
      </div>

      {gameNames.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <Funnel size={14} className="text-esi-muted" />
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium dark:text-zinc-100"
          >
            <option value="">Semua Game</option>
            {gameNames.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
