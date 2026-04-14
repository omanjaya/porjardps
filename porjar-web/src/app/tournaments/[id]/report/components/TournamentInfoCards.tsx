import Image from 'next/image'
import {
  Trophy,
  Users,
  CalendarBlank,
  Sword,
  ChartBar,
  CheckCircle,
} from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import { mediaUrl } from '@/lib/utils'
import { GAME_CONFIG } from '@/constants/games'
import type { Tournament, TeamSummary, GameSlug } from '@/types'
import { formatDate, formatLabel } from '../hooks/useTournamentReport'

export function TeamLogo({ team, size = 10 }: { team: TeamSummary; size?: number }) {
  const url = mediaUrl(team.logo_url ?? null)
  const px = size * 4
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 overflow-hidden',
        `h-${size} w-${size}`
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={team.name}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <Users size={size * 1.6} className="text-stone-400 dark:text-zinc-500" />
      )}
    </div>
  )
}

interface TournamentInfoCardsProps {
  tournament: Tournament
  isCompleted: boolean
}

export function TournamentInfoCards({ tournament, isCompleted }: TournamentInfoCardsProps) {
  const gameSlug = tournament.game?.slug as GameSlug | undefined
  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null
  const GameIcon = gameConfig?.icon ?? Trophy
  const gameLogo = gameConfig?.logo

  return (
    <div className="anim-hero relative overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-esi-red" />

      {/* Completed banner */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 bg-esi-red px-4 py-2 mt-1">
          <CheckCircle size={16} weight="fill" className="text-white" />
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            TURNAMEN SELESAI
          </span>
        </div>
      )}

      <div className="px-6 py-7 md:px-10 md:py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
          {/* Game logo */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-esi-red/20 bg-red-50 dark:bg-red-950/30">
            {gameLogo ? (
              <Image
                src={gameLogo}
                alt={tournament.game?.name ?? ''}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <GameIcon size={40} weight="duotone" className="text-esi-red" />
            )}
          </div>

          {/* Name + badges */}
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-bold text-stone-900 dark:text-zinc-100 md:text-3xl">
              {tournament.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-esi-red px-3 py-1 text-xs font-semibold text-white">
                <GameIcon size={11} weight="fill" />
                {tournament.game?.name ?? 'Game'}
              </span>
              <StatusBadge status={tournament.status} />
            </div>

            {/* Info chips */}
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { icon: ChartBar, label: 'Format', value: formatLabel(tournament.format) },
                { icon: Sword, label: 'Best Of', value: `BO${tournament.best_of}` },
                { icon: Users, label: 'Total Tim', value: `${tournament.team_count} Tim` },
                {
                  icon: CalendarBlank,
                  label: 'Tanggal',
                  value:
                    tournament.start_date
                      ? `${formatDate(tournament.start_date)}${tournament.end_date ? ` – ${formatDate(tournament.end_date)}` : ''}`
                      : 'Belum ditentukan',
                },
              ].map(({ icon: Ic, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-3 py-2"
                >
                  <Ic size={14} className="shrink-0 text-esi-red" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500">{label}</p>
                    <p className="text-xs font-semibold text-stone-800 dark:text-zinc-200">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ongoing note */}
        {!isCompleted && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/30 px-4 py-3">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-600" />
            </span>
            <span className="text-sm text-cyan-800">
              Turnamen sedang berlangsung — laporan ini akan diperbarui seiring berjalannya pertandingan.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
