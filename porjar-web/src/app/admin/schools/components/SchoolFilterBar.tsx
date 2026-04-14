'use client'

import { Input } from '@/components/ui/input'
import type { SchoolLevel } from '@/types'

const levelOptions: SchoolLevel[] = ['SMP', 'SMA', 'SMK', 'MTs', 'MA']

interface Props {
  filterLevel: SchoolLevel | 'all'
  onFilterLevel: (l: SchoolLevel | 'all') => void
  search: string
  onSearch: (s: string) => void
}

export function SchoolFilterBar({ filterLevel, onFilterLevel, search, onSearch }: Props) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {(['all', ...levelOptions] as const).map((level) => (
          <button
            key={level}
            onClick={() => onFilterLevel(level)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterLevel === level
                ? 'bg-esi-red text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800'
            }`}
          >
            {level === 'all' ? 'Semua' : level}
          </button>
        ))}
      </div>
      <Input
        placeholder="Cari sekolah..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full sm:w-48 bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-sm focus:border-esi-red"
        aria-label="Cari sekolah"
      />
    </div>
  )
}
