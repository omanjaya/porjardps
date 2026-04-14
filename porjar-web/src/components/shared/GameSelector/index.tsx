'use client'

import Image from 'next/image'
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
    <>
      {games.map((game) => {
        const config = GAME_CONFIG[game.slug]
        const isActive = activeSlug === game.slug

        return (
          <button
            key={game.slug}
            onClick={() => onSelect(game.slug)}
            className={cn(
              'shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-semibold transition-colors',
              isActive
                ? 'border-esi-red bg-esi-red text-white shadow-sm'
                : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-50 dark:hover:bg-zinc-800'
            )}
          >
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', isActive ? 'bg-white/20' : 'bg-stone-100 dark:bg-zinc-800')}>
              <Image src={config.logo} alt={game.name} width={20} height={20} className="h-5 w-5 rounded object-contain" unoptimized />
            </span>
            {game.name}
          </button>
        )
      })}
    </>
  )
}
