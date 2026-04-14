'use client'

import { GAME_ICONS } from '../constants'
import type { LandingGame } from '@/components/landing/hooks/useLandingData'
import { getGameIcon } from '@/components/landing/lib/gameIconMap'

interface GamesShowcaseSectionProps {
  games?: LandingGame[]
}

export function GamesShowcaseSection({ games = [] }: GamesShowcaseSectionProps) {
  const items = games.length > 0
    ? games.map(g => {
        const { icon: Icon, color } = getGameIcon(g.iconName ?? g.slug)
        return { key: g.slug, name: g.name, Icon, color }
      })
    : GAME_ICONS.map(g => ({ key: g.name, name: g.name, Icon: g.icon, color: g.color }))

  return (
    <section className="games-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 sm:p-8">
        <h3 className="text-center text-sm font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-6">Cabang Esport</h3>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
          {items.map((g) => (
            <div key={g.key} className="game-icon flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 dark:border-zinc-700 shadow-sm transition-transform hover:scale-110" style={{ background: g.color + '10' }}>
                <g.Icon size={28} weight="duotone" style={{ color: g.color }} />
              </div>
              <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400">{g.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
