'use client'

import {
  Trophy,
  Star,
  Crown,
  ShieldCheck,
  UsersThree,
  Medal,
  Crosshair,
  Lock,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { Achievement } from '@/types'

const achievementIcons: Record<string, Icon> = {
  Trophy: Trophy,
  Star: Star,
  Crown: Crown,
  ShieldCheck: ShieldCheck,
  UsersThree: UsersThree,
  Medal: Medal,
  Crosshair: Crosshair,
}

const categoryColors: Record<string, string> = {
  tournament: 'from-amber-500/30 to-amber-900/10 ring-amber-500/40',
  match: 'from-blue-500/30 to-blue-900/10 ring-blue-500/40',
  social: 'from-green-500/30 to-green-900/10 ring-green-500/40',
  special: 'from-purple-500/30 to-purple-900/10 ring-purple-500/40',
}

interface AchievementBadgeProps {
  achievement: Achievement
  earned: boolean
  earnedAt?: string
}

export function AchievementBadge({ achievement, earned, earnedAt }: AchievementBadgeProps) {
  const IconComp = achievementIcons[achievement.icon] ?? Medal
  const colors = categoryColors[achievement.category] ?? categoryColors.match

  if (!earned) {
    return (
      <div className="group relative flex flex-col items-center gap-2 rounded-xl border border-slate-700/30 bg-slate-900/50 p-4 opacity-50">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
          <IconComp size={28} weight="regular" className="text-slate-600" />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/60">
            <Lock size={16} weight="bold" className="text-slate-500" />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-slate-500">{achievement.name}</p>

        {/* Tooltip */}
        <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {achievement.description ?? 'Pencapaian terkunci'}
        </div>
      </div>
    )
  }

  const formattedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/80 p-4 transition-all hover:border-slate-600">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${colors} ring-2 shadow-lg`}
      >
        <IconComp size={28} weight="fill" className="text-slate-50" />
      </div>
      <p className="text-center text-xs font-semibold text-slate-200">{achievement.name}</p>
      {formattedDate && (
        <p className="text-center text-[10px] text-slate-500">{formattedDate}</p>
      )}

      {/* Tooltip */}
      <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {achievement.description ?? achievement.name}
      </div>
    </div>
  )
}
