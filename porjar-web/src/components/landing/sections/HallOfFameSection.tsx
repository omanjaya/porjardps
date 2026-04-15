'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Users, ArrowRight, Ranking, Trophy, Crown } from '@phosphor-icons/react'
import { resolveMediaUrl } from '@/lib/api'
import { formatDateLong } from '@/lib/relativeTime'
import { EmptyState } from '@/components/shared/EmptyState'
import type { TeamLeaderboardEntry } from '@/types'
import { RED } from '../constants'
import type { PastWinner } from './PastWinnersSection'

interface Props {
  topTeams: TeamLeaderboardEntry[]
  pastWinners: PastWinner[]
}


export function HallOfFameSection({ topTeams, pastWinners }: Props) {
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const winners = pastWinners.slice(0, 6)

  return (
    <section className="hall-of-fame-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="mb-8 sm:mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 mb-2">
          <Crown size={12} weight="duotone" style={{ color: RED }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-zinc-300">Hall of Fame</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Hall of Fame</h2>
        <p className="mt-2 text-sm sm:text-base text-stone-500 dark:text-zinc-400">Peringkat terkini dan juara event lampau</p>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1">
          <button
            onClick={() => setTab('a')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
              tab === 'a'
                ? 'bg-esi-red text-white shadow-sm'
                : 'text-stone-600 dark:text-zinc-300 hover:text-esi-red'
            }`}
          >
            <Ranking size={14} weight="duotone" className="mr-1 inline" />
            Peringkat Saat Ini
          </button>
          <button
            onClick={() => setTab('b')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition ${
              tab === 'b'
                ? 'bg-esi-red text-white shadow-sm'
                : 'text-stone-600 dark:text-zinc-300 hover:text-esi-red'
            }`}
          >
            <Crown size={14} weight="duotone" className="mr-1 inline" />
            Juara Event Lampau
          </button>
        </div>
      </div>

      {tab === 'a' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-stone-900 dark:text-zinc-100">Top 5 Tim</h3>
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
                  <li key={team.team_id} className="leaderboard-row anim-list-item flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition hover:bg-stone-50 dark:hover:bg-zinc-800/50">
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
        </div>
      )}

      {tab === 'b' && (
        <div>
          {winners.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Belum ada juara"
              description="Juara turnamen akan muncul di sini setelah event selesai"
              size="sm"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {winners.map((w) => {
                const href = w.tournamentSlug
                  ? `/tournaments/${w.tournamentSlug}`
                  : `/tournaments/${w.tournamentId}`
                return (
                  <Link
                    key={w.tournamentId}
                    href={href}
                    className="winner-card anim-card group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: w.primaryColor || '#EF4444' }}
                    />
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-md shadow-yellow-500/30">
                        <Crown size={24} weight="fill" className="text-yellow-900" />
                      </div>
                      {w.gameName && (
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {w.gameName}
                        </span>
                      )}
                    </div>

                    <h3 className="mb-4 line-clamp-2 text-lg font-bold text-stone-900 dark:text-zinc-100">
                      {w.tournamentName}
                    </h3>

                    <div className="mt-auto flex items-center gap-3 border-t border-stone-100 pt-4 dark:border-zinc-800">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-800">
                        {w.winnerTeamLogo ? (
                          <Image
                            src={w.winnerTeamLogo}
                            alt={w.winnerTeamName}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <Trophy size={22} className="text-stone-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-stone-900 dark:text-zinc-100">
                          {w.winnerTeamName}
                        </div>
                        <div className="truncate text-xs text-stone-500 dark:text-zinc-400">
                          Juara — {formatDateLong(w.completedAt)}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="mt-8 sm:mt-10 flex justify-center">
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-2 rounded-md bg-esi-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-esi-red-dark"
            >
              Lihat Semua Turnamen
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
