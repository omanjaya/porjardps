'use client'

import { useState, useEffect } from 'react'
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Funnel,
  GameController,
  Image as ImageIcon,
  CalendarBlank,
} from '@phosphor-icons/react'
import { CoachLayout } from '@/components/layouts/CoachLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'

interface MatchResult {
  id: string
  team_name: string
  opponent_name: string
  score_a: number
  score_b: number
  won: boolean
  game_name: string
  game_slug: string
  match_type: 'bracket' | 'battle_royale'
  played_at: string
  verification_status: 'verified' | 'pending' | 'rejected'
  screenshots_count: number
  placement?: number
  kills?: number
}

type GameFilter = 'all' | string

export default function CoachResultsPage() {
  const [results, setResults] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState<GameFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function loadResults() {
      try {
        const data = await api.get<MatchResult[]>('/coach/results')
        setResults(data ?? [])
      } catch (err) {
        console.error('Gagal memuat hasil pertandingan:', err)
      } finally {
        setLoading(false)
      }
    }
    loadResults()
  }, [])

  useWebSocket({
    channels: ['live-scores'],
    messageTypes: ['match_complete', 'new_submission'],
    onMessage: () => {
      api.get<MatchResult[]>('/coach/results').then(d => setResults(d ?? [])).catch(() => {})
    },
  })

  const games = [...new Set(results.map(r => r.game_name))]

  const filtered = results.filter(r => {
    if (gameFilter !== 'all' && r.game_name !== gameFilter) return false
    if (dateFrom) {
      const from = new Date(dateFrom)
      if (new Date(r.played_at) < from) return false
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59)
      if (new Date(r.played_at) > to) return false
    }
    return true
  })

  return (
    <CoachLayout>
      <PageHeader
        title="Hasil Pertandingan"
        description="Semua hasil pertandingan tim sekolah"
        breadcrumbs={[
          { label: 'Dashboard', href: '/coach' },
          { label: 'Hasil' },
        ]}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-esi-muted" />
          <span className="text-xs font-semibold uppercase text-esi-muted">Filter</span>
        </div>

        {/* Game filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setGameFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
              gameFilter === 'all'
                ? 'bg-esi-red/10 text-esi-red'
                : 'text-esi-muted hover:bg-esi-bg'
            )}
          >
            Semua Game
          </button>
          {games.map(g => (
            <button
              key={g}
              onClick={() => setGameFilter(g)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                gameFilter === g
                  ? 'bg-esi-red/10 text-esi-red'
                  : 'text-esi-muted hover:bg-esi-bg'
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <CalendarBlank size={14} className="shrink-0 text-esi-muted" />
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 w-[calc(50%-2.75rem)] min-w-0 text-xs border-stone-200 dark:border-zinc-700 focus:border-esi-red focus:ring-esi-red/20 sm:w-36"
          />
          <span className="shrink-0 text-xs text-esi-muted">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 w-[calc(50%-2.75rem)] min-w-0 text-xs border-stone-200 dark:border-zinc-700 focus:border-esi-red focus:ring-esi-red/20 sm:w-36"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-esi-border" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(result => (
            <div
              key={result.id}
              className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Win/Loss indicator */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    result.won ? 'bg-green-100' : 'bg-red-100'
                  )}
                >
                  {result.won ? (
                    <Trophy size={20} weight="fill" className="text-green-600" />
                  ) : (
                    <XCircle size={20} weight="fill" className="text-red-500" />
                  )}
                </div>

                {/* Match info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">
                      {result.game_name}
                    </span>
                    <span
                      className={cn(
                        '-skew-x-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                        result.match_type === 'bracket'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {result.match_type === 'bracket' ? 'Bracket' : 'BR'}
                    </span>
                  </div>

                  {result.match_type === 'bracket' ? (
                    <p className="text-sm font-bold text-esi-text">
                      {result.team_name}{' '}
                      <span className="text-esi-red">{result.score_a} - {result.score_b}</span>{' '}
                      {result.opponent_name}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="truncate font-bold text-esi-text">{result.team_name}</span>
                      <span className="text-xs text-esi-muted">
                        Placement <span className="font-bold text-esi-red">#{result.placement}</span>
                      </span>
                      <span className="text-xs text-esi-muted">
                        Kills <span className="font-bold text-esi-text">{result.kills}</span>
                      </span>
                    </div>
                  )}

                  <p className="mt-1 text-xs text-esi-muted">
                    {new Date(result.played_at).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Status + screenshots */}
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      result.verification_status === 'verified' && 'bg-green-50 dark:bg-green-950 text-green-700 border-green-200 dark:border-green-800',
                      result.verification_status === 'pending' && 'bg-amber-50 dark:bg-amber-950 text-amber-700 border-amber-200 dark:border-amber-800',
                      result.verification_status === 'rejected' && 'bg-red-50 dark:bg-red-950 text-red-700 border-red-200 dark:border-red-800',
                    )}
                  >
                    {result.verification_status === 'verified' && <CheckCircle size={12} weight="fill" />}
                    {result.verification_status === 'pending' && <Clock size={12} weight="fill" />}
                    {result.verification_status === 'rejected' && <XCircle size={12} weight="fill" />}
                    {result.verification_status === 'verified' ? 'Terverifikasi' : result.verification_status === 'pending' ? 'Pending' : 'Ditolak'}
                  </span>
                  {result.screenshots_count > 0 && (
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-esi-muted">
                      <ImageIcon size={10} />
                      {result.screenshots_count} bukti
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center shadow-sm">
          <Trophy size={40} weight="duotone" className="mx-auto mb-3 text-esi-border" />
          <p className="text-sm text-esi-muted">
            {gameFilter !== 'all' || dateFrom || dateTo
              ? 'Tidak ada hasil yang cocok dengan filter'
              : 'Belum ada hasil pertandingan'}
          </p>
        </div>
      )}
    </CoachLayout>
  )
}
