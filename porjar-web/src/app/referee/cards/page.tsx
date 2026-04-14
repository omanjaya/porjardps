'use client'

import { useState, useEffect } from 'react'
import {
  IdentificationCard,
  CheckCircle,
  XCircle,
  Funnel,
} from '@phosphor-icons/react'
import { RefereeLayout } from '@/components/layouts/RefereeLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { MatchCard } from '@/types'

type CardFilter = 'all' | 'yellow' | 'red'

export default function RefereeCardsPage() {
  const [cards, setCards] = useState<MatchCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CardFilter>('all')

  useEffect(() => {
    async function loadCards() {
      try {
        const data = await api.get<MatchCard[]>('/referee/cards')
        setCards(data ?? [])
      } catch (err) {
        console.error('Gagal memuat riwayat kartu:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCards()
  }, [])

  const filtered =
    filter === 'all' ? cards : cards.filter((c) => c.card_type === filter)

  const yellowCount = cards.filter((c) => c.card_type === 'yellow').length
  const redCount = cards.filter((c) => c.card_type === 'red').length

  return (
    <RefereeLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-stone-200 dark:border-zinc-700 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur-sm px-4 pb-3 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <IdentificationCard size={18} weight="duotone" className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-esi-text sm:text-xl">Riwayat Kartu</h1>
            <p className="text-[11px] text-esi-muted">
              {cards.length} kartu dikeluarkan
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              filter === 'all'
                ? 'bg-esi-red text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-esi-muted border border-stone-200 dark:border-zinc-700'
            )}
          >
            <Funnel size={12} />
            Semua
            <span
              className={cn(
                'tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                filter === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-100 dark:bg-zinc-700 text-esi-muted'
              )}
            >
              {cards.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('yellow')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              filter === 'yellow'
                ? 'bg-yellow-500 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-esi-muted border border-stone-200 dark:border-zinc-700'
            )}
          >
            <span className="inline-block h-3 w-2.5 rounded-sm bg-yellow-400" />
            Kuning
            <span
              className={cn(
                'tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                filter === 'yellow'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-100 dark:bg-zinc-700 text-esi-muted'
              )}
            >
              {yellowCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('red')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              filter === 'red'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-esi-muted border border-stone-200 dark:border-zinc-700'
            )}
          >
            <span className="inline-block h-3 w-2.5 rounded-sm bg-red-500" />
            Merah
            <span
              className={cn(
                'tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                filter === 'red'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-100 dark:bg-zinc-700 text-esi-muted'
              )}
            >
              {redCount}
            </span>
          </button>
        </div>
      </div>

      {/* Card list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-esi-border" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((card) => (
            <div
              key={card.id}
              className={cn(
                'rounded-xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden',
                card.is_revoked
                  ? 'border-stone-200 dark:border-zinc-700 opacity-60'
                  : card.card_type === 'yellow'
                    ? 'border-yellow-200 dark:border-yellow-800/50'
                    : 'border-red-200 dark:border-red-800/50'
              )}
            >
              {/* Color bar */}
              <div
                className={cn(
                  'h-1',
                  card.card_type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                )}
              />

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Card type + Team */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold',
                          card.card_type === 'yellow'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-2.5 rounded-sm',
                            card.card_type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                          )}
                        />
                        {card.card_type === 'yellow' ? 'Kuning' : 'Merah'}
                      </span>
                      {card.is_revoked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                          <XCircle size={10} weight="fill" />
                          Dicabut
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/50 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                          <CheckCircle size={10} weight="fill" />
                          Aktif
                        </span>
                      )}
                    </div>

                    {/* Team name */}
                    <p className="text-sm font-bold text-esi-text">
                      {card.team_name ?? 'Tim tidak diketahui'}
                    </p>

                    {/* Reason */}
                    <p className="mt-1 text-xs text-esi-muted line-clamp-2">
                      {card.reason}
                    </p>
                  </div>

                  {/* Point deduction */}
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-black tabular-nums text-red-500">
                      -{card.point_deduction}
                    </p>
                    <p className="text-[10px] text-esi-muted">poin</p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="mt-3 border-t border-stone-100 dark:border-zinc-800 pt-2">
                  <p className="text-[11px] text-esi-muted">
                    {new Date(card.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    {new Date(card.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900/50 p-10 text-center">
          <IdentificationCard
            size={40}
            weight="duotone"
            className="mx-auto mb-3 text-esi-border"
          />
          <p className="text-sm font-medium text-esi-muted">
            {filter !== 'all'
              ? `Tidak ada kartu ${filter === 'yellow' ? 'kuning' : 'merah'}`
              : 'Belum ada kartu yang dikeluarkan'}
          </p>
        </div>
      )}
    </RefereeLayout>
  )
}
