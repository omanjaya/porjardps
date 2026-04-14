import { Trophy, Medal, Crown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Standing } from '@/types'
import { TeamLogo } from './TournamentInfoCards'

interface PodiumCardProps {
  standing: Standing
  rank: 1 | 2 | 3
  isBR: boolean
}

function PodiumCard({ standing, rank, isBR }: PodiumCardProps) {
  const configs = {
    1: {
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      rankText: 'text-yellow-600',
      labelColor: 'text-yellow-700',
      label: 'Juara 1',
      ringClass: 'ring-2 ring-yellow-300',
      icon: Crown,
      size: 'large',
    },
    2: {
      border: 'border-stone-300 dark:border-zinc-600',
      bg: 'bg-stone-50 dark:bg-zinc-800/50',
      iconBg: 'bg-stone-100 dark:bg-zinc-800',
      iconColor: 'text-stone-500 dark:text-zinc-400',
      rankText: 'text-stone-600 dark:text-zinc-400',
      labelColor: 'text-stone-600 dark:text-zinc-400',
      label: 'Runner Up',
      ringClass: 'ring-1 ring-stone-200',
      icon: Medal,
      size: 'medium',
    },
    3: {
      border: 'border-orange-300',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      rankText: 'text-orange-600',
      labelColor: 'text-orange-700',
      label: 'Peringkat 3',
      ringClass: 'ring-1 ring-orange-200',
      icon: Trophy,
      size: 'medium',
    },
  }

  const cfg = configs[rank]
  const IconComp = cfg.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border-2 p-5 shadow-sm transition-transform hover:-translate-y-0.5',
        cfg.border,
        cfg.bg,
        cfg.ringClass,
        rank === 1 && 'py-7'
      )}
    >
      {/* Rank icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          cfg.iconBg,
          rank === 1 ? 'h-12 w-12' : 'h-10 w-10'
        )}
      >
        <IconComp
          size={rank === 1 ? 26 : 22}
          weight="fill"
          className={cfg.iconColor}
        />
      </div>

      {/* Team logo */}
      <TeamLogo team={standing.team} size={rank === 1 ? 14 : 12} />

      {/* Team name */}
      <div className="text-center">
        <p
          className={cn(
            'font-bold text-stone-900 dark:text-zinc-100 leading-tight',
            rank === 1 ? 'text-base' : 'text-sm'
          )}
        >
          {standing.team.name}
        </p>
        <p className={cn('mt-0.5 text-xs font-semibold', cfg.labelColor)}>{cfg.label}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-center">
        <div>
          <p className={cn('text-lg font-bold tabular-nums', cfg.rankText)}>
            {standing.total_points}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-zinc-400">Poin</p>
        </div>
        <div className="h-8 w-px bg-stone-200" />
        {isBR ? (
          <div>
            <p className="text-lg font-bold tabular-nums text-stone-700 dark:text-zinc-300">{standing.total_kills}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-zinc-400">Kills</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-bold tabular-nums text-stone-700 dark:text-zinc-300">{standing.wins}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-zinc-400">Menang</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface TournamentTopPlayersProps {
  top3: Standing[]
  isBR: boolean
}

export function TournamentTopPlayers({ top3, isBR }: TournamentTopPlayersProps) {
  if (top3.length < 1) return null
  return (
    <div className="anim-section rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Crown size={20} weight="fill" className="text-yellow-500" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100">Podium</h2>
      </div>

      {/* Podium layout: 2 - 1 - 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Rank 2 — left */}
        {top3[1] ? (
          <div className="sm:mt-4">
            <PodiumCard standing={top3[1]} rank={2} isBR={isBR} />
          </div>
        ) : (
          <div />
        )}

        {/* Rank 1 — center, elevated */}
        {top3[0] && (
          <div className="sm:-mt-2">
            <PodiumCard standing={top3[0]} rank={1} isBR={isBR} />
          </div>
        )}

        {/* Rank 3 — right */}
        {top3[2] ? (
          <div className="sm:mt-6">
            <PodiumCard standing={top3[2]} rank={3} isBR={isBR} />
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
