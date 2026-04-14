'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Users, ArrowRight, Ranking, Trophy } from '@phosphor-icons/react'
import { resolveMediaUrl } from '@/lib/api'
import { EmptyState } from '@/components/shared/EmptyState'
import type { TeamLeaderboardEntry } from '@/types'
import { RED } from '../constants'

interface Props {
  topTeams: TeamLeaderboardEntry[]
}

export function LeaderboardSection({ topTeams }: Props) {
  return (
    <section className="leaderboard-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 mb-2">
            <Ranking size={12} weight="duotone" style={{ color: RED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-zinc-300">Peringkat</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Top 5 Tim</h2>
        </div>
        <Link href="/leaderboards" className="inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2" style={{ color: RED }}>
          Leaderboard Lengkap <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        {topTeams.length === 0 ? (
          <EmptyState
            size="sm"
            icon={Trophy}
            title="Belum ada data leaderboard"
            description="Peringkat tim akan muncul setelah pertandingan dimulai."
          />
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-zinc-800">
            {topTeams.map((team, idx) => (
              <li key={team.team_id} className="leaderboard-row flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                    idx === 1 ? 'bg-stone-200 text-stone-700 dark:bg-zinc-700 dark:text-zinc-200' :
                    idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                    'bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {team.rank}
                </div>
                {team.team_logo_url ? (
                  <Image src={resolveMediaUrl(team.team_logo_url) ?? ''} alt={team.team_name} width={32} height={32} className="h-8 w-8 rounded-lg object-contain bg-stone-100 dark:bg-zinc-800" unoptimized />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Users size={14} className="text-stone-400 dark:text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 dark:text-zinc-100 truncate">{team.team_name}</p>
                  {team.school_name && (
                    <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">{team.school_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-black" style={{ color: RED }}>{team.total_points}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">poin</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
