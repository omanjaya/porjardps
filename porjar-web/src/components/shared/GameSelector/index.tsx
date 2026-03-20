'use client'

import { cn } from '@/lib/utils'
import { GAME_CONFIG } from '@/constants/games'
import type { GameSlug } from '@/types'

interface GameTab {
  slug: GameSlug
  name: string
}

interface GameSelectorProps {
  games: GameTab[]
  activeSlug: GameSlug | null
  onSelect: (slug: GameSlug) => void
}

export function GameSelector({ games, activeSlug, onSelect }: GameSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {games.map((game) => {
        const config = GAME_CONFIG[game.slug]
        const isActive = activeSlug === game.slug

        return (
          <button
            key={game.slug}
            onClick={() => onSelect(game.slug)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-semibold transition-colors',
              isActive
                ? 'border-porjar-red bg-porjar-red text-white shadow-sm'
                : 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            )}
          >
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', isActive ? 'bg-white/20' : 'bg-stone-100')}>
              <img src={config.logo} alt={game.name} className="h-5 w-5 rounded object-contain" />
            </span>
            {game.name}
          </button>
        )
      })}
    </div>
  )
}
