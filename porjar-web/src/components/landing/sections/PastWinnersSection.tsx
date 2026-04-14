// To wire into landing page:
// import { PastWinnersSection } from '@/components/landing/sections/PastWinnersSection'
// <PastWinnersSection pastWinners={pastWinners} />
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Crown, Trophy, ArrowRight } from '@phosphor-icons/react'
import { EmptyState } from '@/components/shared/EmptyState'

export type PastWinner = {
  tournamentId: number
  tournamentName: string
  gameName?: string
  primaryColor?: string
  winnerTeamName: string
  winnerTeamLogo?: string
  completedAt: string
  tournamentSlug?: string
}

interface PastWinnersSectionProps {
  pastWinners: PastWinner[]
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function PastWinnersSection({ pastWinners }: PastWinnersSectionProps) {
  const winners = pastWinners.slice(0, 6)

  return (
    <section className="past-winners-section relative py-12 sm:py-16 lg:py-20 bg-stone-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-esi-red/10 px-4 py-1.5 text-sm font-semibold text-esi-red dark:bg-esi-red/20">
            <Crown size={16} weight="fill" />
            Hall of Champions
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">
            Juara Terakhir
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 dark:text-zinc-400">
            Tim-tim juara dari turnamen yang telah selesai
          </p>
        </div>

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
                  className="winner-card group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
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
                        Juara — {formatDate(w.completedAt)}
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
    </section>
  )
}
