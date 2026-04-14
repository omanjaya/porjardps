'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sword,
  IdentificationCard,
  ArrowRight,
  ShieldCheck,
  Lightning,
  Warning,
  Clock,
  Trophy,
} from '@phosphor-icons/react'
import { RefereeLayout } from '@/components/layouts/RefereeLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Icon } from '@phosphor-icons/react'
import type { RefereeAssignment, MatchCard, LiveMatch } from '@/types'

interface StatCardProps {
  label: string
  value: number | string
  icon: Icon
  loading?: boolean
  color?: string
  bgColor?: string
}

function StatCard({
  label,
  value,
  icon: IconComp,
  loading,
  color = 'text-esi-red',
  bgColor = 'bg-esi-red/10',
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgColor}`}
        >
          <IconComp size={24} weight="duotone" className={color} />
        </div>
        <div className="min-w-0">
          {loading ? (
            <>
              <Skeleton className="mb-1.5 h-7 w-14 bg-esi-border" />
              <Skeleton className="h-3.5 w-20 bg-esi-border" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums text-esi-text">{value}</p>
              <p className="text-xs text-esi-muted">{label}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RefereeDashboardPage() {
  const [assignments, setAssignments] = useState<RefereeAssignment[]>([])
  const [cards, setCards] = useState<MatchCard[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [assignData, cardData, matchData] = await Promise.all([
          api.get<RefereeAssignment[]>('/referee/matches'),
          api.get<MatchCard[]>('/referee/cards'),
          api.get<LiveMatch[]>('/referee/matches'),
        ])
        setAssignments(assignData ?? [])
        setCards(cardData ?? [])
        setLiveMatches(matchData ?? [])
      } catch (err) {
        console.error('Gagal memuat dashboard wasit:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const cardsToday = cards.filter((c) => c.created_at.slice(0, 10) === today)
  const liveCount = liveMatches.length

  return (
    <RefereeLayout>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-esi-red/10">
          <ShieldCheck size={24} weight="duotone" className="text-esi-red" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-esi-text sm:text-2xl">Dashboard Wasit</h1>
          <p className="text-xs text-esi-muted sm:text-sm">
            Kelola pertandingan dan kartu pelanggaran
          </p>
        </div>
      </div>

      {/* Live alert */}
      {!loading && liveCount > 0 && (
        <Link
          href="/referee/matches"
          className="mb-4 flex items-center gap-3 rounded-xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/50 p-4 shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/25">
            <Lightning size={20} weight="fill" className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-green-800 dark:text-green-200">
              {liveCount} Pertandingan Sedang Live
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Ketuk untuk melihat dan mengelola
            </p>
          </div>
          <ArrowRight size={18} className="text-green-600 dark:text-green-400" />
        </Link>
      )}

      {/* Pending cards alert */}
      {!loading && cardsToday.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-4 shadow-sm">
          <Warning size={20} weight="fill" className="shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-bold">{cardsToday.length} kartu</span> dikeluarkan hari ini
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Match Live"
          value={liveCount}
          icon={Lightning}
          loading={loading}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label="Ditugaskan"
          value={assignments.length}
          icon={Sword}
          loading={loading}
        />
        <StatCard
          label="Kartu Hari Ini"
          value={cardsToday.length}
          icon={IdentificationCard}
          loading={loading}
          color="text-amber-500"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          label="Total Kartu"
          value={cards.length}
          icon={IdentificationCard}
          loading={loading}
          color="text-red-500"
          bgColor="bg-red-100 dark:bg-red-900/30"
        />
      </div>

      {/* Match Hari Ini */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-esi-muted">
          <Clock size={14} className="mr-1.5 inline-block" />
          Match Hari Ini
        </h2>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-esi-border" />
            ))}
          </div>
        ) : liveMatches.length > 0 ? (
          <div className="space-y-2">
            {liveMatches.slice(0, 5).map((match) => (
              <Link
                key={`${match.type}-${match.match_id}`}
                href="/referee/matches"
                className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all active:scale-[0.98] hover:border-esi-red/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Sword size={18} weight="duotone" className="text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-esi-text">
                    {match.type === 'br'
                      ? match.lobby_name ?? match.team_a_name
                      : `${match.team_a_name} vs ${match.team_b_name}`}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:text-green-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                      Live
                    </span>
                    <span className="text-[11px] text-esi-muted flex items-center gap-1">
                      <Trophy size={10} />
                      {match.tournament_name}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-esi-muted" />
              </Link>
            ))}
            {liveMatches.length > 5 && (
              <Link
                href="/referee/matches"
                className="block text-center text-sm font-medium text-esi-red hover:underline py-2"
              >
                Lihat {liveMatches.length - 5} match lainnya
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900/50 p-8 text-center">
            <Clock size={32} weight="duotone" className="mx-auto mb-2 text-esi-border" />
            <p className="text-sm text-esi-muted">Belum ada pertandingan live saat ini</p>
            <p className="mt-0.5 text-xs text-esi-muted">Otomatis refresh setiap 30 detik</p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/referee/matches"
          className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all active:scale-[0.98] hover:border-esi-red/30 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-esi-red/10">
              <Sword size={20} weight="duotone" className="text-esi-red" />
            </div>
            <div>
              <p className="text-sm font-bold text-esi-text">Pertandingan Saya</p>
              <p className="text-xs text-esi-muted">Lihat dan kelola pertandingan</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-esi-muted" />
        </Link>

        <Link
          href="/referee/cards"
          className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all active:scale-[0.98] hover:border-esi-red/30 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <IdentificationCard size={20} weight="duotone" className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-esi-text">Riwayat Kartu</p>
              <p className="text-xs text-esi-muted">Semua kartu yang dikeluarkan</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-esi-muted" />
        </Link>
      </div>
    </RefereeLayout>
  )
}
