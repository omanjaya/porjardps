'use client'

import Link from 'next/link'
import { Trophy, ArrowRight, Lightning } from '@phosphor-icons/react'
import type { Tournament } from '@/types'
import { RED } from '../constants'

interface Props {
  liveTournaments: Tournament[]
}

export function LiveTournamentsSection({ liveTournaments }: Props) {
  return (
    <section className="live-tournaments-section mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-1 mb-2">
            <Lightning size={12} weight="fill" style={{ color: RED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: RED }}>Live</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">Turnamen Berlangsung</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">Pertandingan yang sedang aktif saat ini</p>
        </div>
        <Link href="/tournaments" className="inline-flex items-center gap-1 text-sm font-semibold transition hover:gap-2" style={{ color: RED }}>
          Semua Turnamen <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
      {liveTournaments.length === 0 ? (
        <div className="live-tournament-card anim-card mx-auto max-w-xl rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-zinc-800">
            <Trophy size={24} weight="duotone" className="text-stone-400 dark:text-zinc-500" />
          </div>
          <p className="font-bold text-stone-800 dark:text-zinc-200">Tidak ada turnamen berjalan</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">Belum ada turnamen yang sedang berlangsung saat ini.</p>
          <Link href="/tournaments" className="mt-4 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: RED }}>
            Lihat Semua Turnamen <ArrowRight size={12} weight="bold" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liveTournaments.map(t => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}/bracket`}
              className="live-tournament-card anim-card group rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                  <Lightning size={9} weight="fill" /> Live
                </span>
                {t.game?.name && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">{t.game.name}</span>
                )}
              </div>
              <h3 className="mt-3 text-base font-bold text-stone-900 dark:text-zinc-100 line-clamp-2 group-hover:text-[#C41E2A] transition-colors">{t.name}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
                <span className="capitalize">{t.stage?.replace('_', ' ')}</span>
                <span>•</span>
                <span>{t.team_count} tim</span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold transition-all group-hover:gap-2" style={{ color: RED }}>
                Lihat Bracket <ArrowRight size={12} weight="bold" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
