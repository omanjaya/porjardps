'use client'

import { Buildings, GameController, UsersThree, CalendarCheck } from '@phosphor-icons/react'
import { RED } from '../constants'
import type { LandingStats } from '../hooks/useLandingData'

const nf = new Intl.NumberFormat('id-ID')
const fmt = (n: number | undefined | null) =>
  typeof n === 'number' && Number.isFinite(n) ? nf.format(n) : '—'

interface StatsSectionProps {
  stats: LandingStats | null
}

export function StatsSection({ stats }: StatsSectionProps) {
  const items = [
    { icon: Buildings, value: fmt(stats?.schools), label: 'Sekolah Terdaftar' },
    { icon: GameController, value: fmt(stats?.games), label: 'Cabang Esport' },
    { icon: UsersThree, value: fmt(stats?.athletes), label: 'Atlet Pelajar' },
    { icon: CalendarCheck, value: fmt(stats?.tournaments_total), label: 'Turnamen' },
  ]

  return (
    <section className="stats-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="stat-item anim-card rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-6 text-center transition-all hover:shadow-md">
            <div className="mx-auto mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950">
              <s.icon size={22} weight="duotone" style={{ color: RED }} />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">{s.value}</div>
            <div className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
