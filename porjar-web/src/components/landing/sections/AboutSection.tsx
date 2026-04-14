'use client'

import { forwardRef } from 'react'
import { Trophy, Users, Buildings, Medal, Lightning, Star, GameController } from '@phosphor-icons/react'
import { RED } from '../constants'
import type { LandingAboutItem } from '../hooks/useLandingData'

const ICON_MAP: Record<string, any> = {
  trophy: Trophy,
  users: Users,
  buildings: Buildings,
  medal: Medal,
  lightning: Lightning,
  star: Star,
}
const getIcon = (name: string) => ICON_MAP[name?.toLowerCase()] ?? GameController

const DEFAULT_ITEMS: LandingAboutItem[] = [
  {
    icon: 'trophy',
    title: 'Kompetisi Resmi',
    description: 'Menyelenggarakan turnamen esport resmi bagi pelajar SD, SMP, dan SMA se-Kota Denpasar',
  },
  {
    icon: 'users',
    title: 'Pembinaan Atlet',
    description: 'Membina bakat esport pelajar melalui program pelatihan dan pendampingan yang terstruktur',
  },
  {
    icon: 'buildings',
    title: 'Kolaborasi',
    description: 'Bekerja sama dengan Dinas Pemuda dan Olahraga serta sekolah-sekolah di Kota Denpasar',
  },
]

interface AboutSectionProps {
  aboutItems?: LandingAboutItem[]
}

export const AboutSection = forwardRef<HTMLElement, AboutSectionProps>(function AboutSection({ aboutItems }, ref) {
  const items = aboutItems && aboutItems.length > 0 ? aboutItems : DEFAULT_ITEMS
  return (
    <section id="about" ref={ref} className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 scroll-mt-20">
      <div className="mb-8 sm:mb-10 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Tentang ESI Kota Denpasar</h2>
        <p className="mt-2 text-sm sm:text-base text-stone-500 dark:text-zinc-400 max-w-lg mx-auto">
          Esports Indonesia (ESI) Kota Denpasar merupakan organisasi resmi yang menaungi kegiatan esport di Kota Denpasar
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = getIcon(item.icon)
          return (
            <div key={item.title} className="about-item rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 text-center transition-all hover:shadow-md">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950">
                <Icon size={24} weight="duotone" style={{ color: RED }} />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-zinc-100">{item.title}</h3>
              <p className="mt-2 text-sm text-stone-500 dark:text-zinc-400">{item.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
})
