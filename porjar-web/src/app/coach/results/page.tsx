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
          { label: 'Coach', href: '/coach' },
          { label: 'Hasil' },
        ]}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-porjar-muted" />
          <span className="text-xs font-semibold uppercase text-porjar-muted">Filter</span>
        </div>

        {/* Game filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setGameFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
              gameFilter === 'all'
                ? 'bg-porjar-red/10 text-porjar-red'
                : 'text-porjar-muted hover:bg-porjar-bg'
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
                  ? 'bg-porjar-red/10 text-porjar-red'
                  : 'text-porjar-muted hover:bg-porjar-bg'
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CalendarBlank size={14} className="text-porjar-muted" />
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 w-36 text-xs border-stone-200 focus:border-porjar-red focus:ring-porjar-red/20"
          />
          <span className="text-xs text-porjar-muted">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 w-36 text-xs border-stone-200 focus:border-porjar-red focus:ring-porjar-red/20"
          />
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-porjar-border" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(result => (
            <div
              key={result.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
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
                    <span className="text-xs font-semibold uppercase tracking-wider text-porjar-muted">
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
                    <p className="text-sm font-bold text-porjar-text">
                      {result.team_name}{' '}
                      <span className="text-porjar-red">{result.score_a} - {result.score_b}</span>{' '}
                      {result.opponent_name}
                    </p>
                  ) : (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-porjar-text">{result.team_name}</span>
                      <span className="text-xs text-porjar-muted">
                        Placement <span className="font-bold text-porjar-red">#{result.placement}</span>
                      </span>
                      <span className="text-xs text-porjar-muted">
                        Kills <span className="font-bold text-porjar-text">{result.kills}</span>
                      </span>
                    </div>
                  )}

                  <p className="mt-1 text-xs text-porjar-muted">
                    {new Date(result.played_at).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Status + screenshots */}
                <div className="text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      result.verification_status === 'verified' && 'bg-green-50 text-green-700 border-green-200',
                      result.verification_status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                      result.verification_status === 'rejected' && 'bg-red-50 text-red-700 border-red-200',
                    )}
                  >
                    {result.verification_status === 'verified' && <CheckCircle size={12} weight="fill" />}
                    {result.verification_status === 'pending' && <Clock size={12} weight="fill" />}
                    {result.verification_status === 'rejected' && <XCircle size={12} weight="fill" />}
                    {result.verification_status === 'verified' ? 'Terverifikasi' : result.verification_status === 'pending' ? 'Pending' : 'Ditolak'}
                  </span>
                  {result.screenshots_count > 0 && (
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-porjar-muted">
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
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <Trophy size={40} weight="duotone" className="mx-auto mb-3 text-porjar-border" />
          <p className="text-sm text-porjar-muted">
            {gameFilter !== 'all' || dateFrom || dateTo
              ? 'Tidak ada hasil yang cocok dengan filter'
              : 'Belum ada hasil pertandingan'}
          </p>
        </div>
      )}
    </CoachLayout>
  )
}
