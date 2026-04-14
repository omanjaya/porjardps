'use client'

import Link from 'next/link'
import { Sword, PaperPlaneTilt, Trophy, Lock } from '@phosphor-icons/react'
import { AnimatedCard } from '@/components/shared/AnimatedCard'

export function QuickLinksSection() {
  return (
    <AnimatedCard delay={375}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLinkCard
          href="/dashboard/my-matches"
          icon={Sword}
          label="Pertandingan"
          color="text-esi-red"
          bg="bg-esi-red/10"
        />
        <QuickLinkCard
          href="/dashboard/submit-result"
          icon={PaperPlaneTilt}
          label="Kirim Bukti"
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-950/30"
        />
        <QuickLinkCard
          href="/dashboard/tournament"
          icon={Trophy}
          label="Turnamen"
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-950/30"
        />
        <QuickLinkCard
          href="/dashboard/change-password"
          icon={Lock}
          label="Ubah Password"
          color="text-stone-600 dark:text-zinc-400"
          bg="bg-stone-100 dark:bg-zinc-800"
        />
      </div>
    </AnimatedCard>
  )
}

function QuickLinkCard({
  href,
  icon: IconComp,
  label,
  color,
  bg,
  external,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; weight?: 'duotone' | 'fill' | 'regular' | 'bold' | 'light' | 'thin'; className?: string }>
  label: string
  color: string
  bg: string
  external?: boolean
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex flex-col items-center gap-2 rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all hover:border-esi-red/30 hover:shadow-md"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        <IconComp size={22} weight="duotone" className={color} />
      </div>
      <span className="text-xs font-semibold text-esi-text">{label}</span>
    </Link>
  )
}
