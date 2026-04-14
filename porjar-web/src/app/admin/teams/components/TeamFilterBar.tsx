'use client'

import { GameSelector } from '@/components/shared/GameSelector'
import type { GameSlug, TeamStatus } from '@/types'

const statusFilters: { value: TeamStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

interface Props {
  statusFilter: TeamStatus | 'all'
  onStatusChange: (s: TeamStatus | 'all') => void
  games: { id: string; slug: GameSlug; name: string }[]
  activeGame: GameSlug | null
  onGameChange: (g: GameSlug | null) => void
}

export function TeamFilterBar({ statusFilter, onStatusChange, games, activeGame, onGameChange }: Props) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => onStatusChange(sf.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === sf.value
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {games.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => onGameChange(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeGame === null
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800'
            }`}
          >
            Semua Game
          </button>
          <GameSelector games={games} activeSlug={activeGame} onSelect={onGameChange} />
        </div>
      )}
    </div>
  )
}
