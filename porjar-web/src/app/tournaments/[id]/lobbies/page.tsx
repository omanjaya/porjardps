'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Trophy,
  Target,
  Sword,
  Users,
  CalendarBlank,
  ArrowLeft,
  Lightning,
  Crown,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { cn } from '@/lib/utils'
import type { Tournament, BRLobby, BRLobbyResult } from '@/types'

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Belum dijadwalkan'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PlacementMedal({ placement }: { placement: number }) {
  if (placement === 1)
    return <Crown size={14} weight="fill" className="text-amber-500" />
  if (placement === 2)
    return <Trophy size={14} weight="fill" className="text-stone-400" />
  if (placement === 3)
    return <Trophy size={14} weight="fill" className="text-amber-700/60" />
  return null
}

function rowStyle(placement: number): string {
  if (placement === 1) return 'bg-amber-50 border-amber-100'
  if (placement === 2) return 'bg-stone-50 border-stone-100'
  if (placement === 3) return 'bg-stone-50/50 border-stone-100'
  return 'bg-white border-stone-100'
}

function ResultsTable({ results }: { results: BRLobbyResult[] }) {
  const sorted = [...results].sort((a, b) => a.placement - b.placement)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50">
            <th className="py-2 pl-3 pr-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 w-10">
              #
            </th>
            <th className="py-2 px-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tim
            </th>
            <th className="py-2 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 w-16">
              <span className="flex items-center justify-center gap-1">
                <Sword size={11} />
                Kills
              </span>
            </th>
            <th className="py-2 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 w-20">
              <span className="flex items-center justify-center gap-1">
                <Target size={11} />
                Plcmt Pts
              </span>
            </th>
            <th className="py-2 px-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 w-20">
              <span className="flex items-center justify-center gap-1">
                <Lightning size={11} />
                Kill Pts
              </span>
            </th>
            <th className="py-2 pl-2 pr-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500 w-16">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {sorted.map((result) => (
            <tr
              key={result.team.id}
              className={cn(
                'border-b transition-colors',
                rowStyle(result.placement)
              )}
            >
              <td className="py-2.5 pl-3 pr-2">
                <span className="flex items-center gap-1.5 font-semibold text-stone-700">
                  <PlacementMedal placement={result.placement} />
                  {result.placement}
                </span>
              </td>
              <td className="py-2.5 px-2">
                <span
                  className={cn(
                    'font-medium text-stone-900 truncate max-w-[160px] block',
                    result.placement === 1 && 'text-amber-700'
                  )}
                >
                  {result.team.name}
                </span>
              </td>
              <td className="py-2.5 px-2 text-center tabular-nums text-stone-700">
                {result.kills}
              </td>
              <td className="py-2.5 px-2 text-center tabular-nums text-stone-700">
                {result.placement_points}
              </td>
              <td className="py-2.5 px-2 text-center tabular-nums text-stone-700">
                {result.kill_points}
              </td>
              <td className="py-2.5 pl-2 pr-3 text-center">
                <span className="font-bold text-porjar-red tabular-nums">
                  {result.total_points}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LobbyCard({ lobby }: { lobby: BRLobby }) {
  const hasResults = lobby.status === 'completed' && lobby.results.length > 0
  const winner = hasResults
    ? [...lobby.results].sort((a, b) => a.placement - b.placement)[0]
    : null

  return (
    <div className="anim-section overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-stone-900">{lobby.lobby_name}</h3>
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
              Hari {lobby.day_number}
            </span>
            <StatusBadge status={lobby.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <CalendarBlank size={11} />
              {formatDateTime(lobby.scheduled_at)}
            </span>
            {lobby.room_id && (
              <span className="font-mono text-stone-400">
                Room: {lobby.room_id}
              </span>
            )}
          </div>
        </div>

        {/* Winner chip */}
        {winner && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Crown size={12} weight="fill" className="text-amber-500" />
            {winner.team.name}
          </div>
        )}
      </div>

      {/* Results */}
      {hasResults ? (
        <ResultsTable results={lobby.results} />
      ) : (
        <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
          <Trophy size={28} weight="thin" className="text-stone-300" />
          <p className="text-sm font-medium text-stone-500">
            Hasil belum tersedia
          </p>
          <p className="text-xs text-stone-400">
            {lobby.status === 'live'
              ? 'Pertandingan sedang berlangsung...'
              : lobby.status === 'scheduled'
                ? 'Lobby dijadwalkan'
                : 'Menunggu lobby dimulai'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function TournamentLobbiesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState<number | 'all'>('all')

  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const [t, l] = await Promise.all([
          api.get<Tournament>(`/tournaments/${params.id}`),
          api.get<BRLobby[]>(`/tournaments/${params.id}/lobbies`).catch(
            () => [] as BRLobby[]
          ),
        ])
        setTournament(t)
        setLobbies(l ?? [])
      } catch (err) {
        console.error('Gagal memuat data lobby:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  // ── Loading skeleton ──
  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-lg bg-stone-100" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-stone-100" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full bg-stone-100" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl bg-stone-100" />
            ))}
          </div>
        </div>
      </PublicLayout>
    )
  }

  // ── Not found ──
  if (!tournament) {
    return (
      <PublicLayout>
        <EmptyState
          icon={Trophy}
          title="Turnamen Tidak Ditemukan"
          description="Turnamen yang kamu cari tidak ada atau sudah dihapus."
        />
      </PublicLayout>
    )
  }

  // ── Wrong format guard ──
  if (tournament.format !== 'battle_royale_points') {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <Trophy size={32} className="text-stone-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">
            Format Tidak Didukung
          </h2>
          <p className="mb-6 max-w-sm text-sm text-stone-500">
            Halaman ini hanya tersedia untuk turnamen Battle Royale.
          </p>
          <Link
            href={`/tournaments/${params.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
          >
            <ArrowLeft size={16} />
            Kembali ke Turnamen
          </Link>
        </div>
      </PublicLayout>
    )
  }

  // ── Derived values ──
  const uniqueDays = Array.from(
    new Set(lobbies.map((l) => l.day_number))
  ).sort((a, b) => a - b)

  const filteredLobbies =
    activeDay === 'all'
      ? lobbies
      : lobbies.filter((l) => l.day_number === activeDay)

  const completedCount = lobbies.filter((l) => l.status === 'completed').length
  const totalTeams = new Set(
    lobbies.flatMap((l) => l.results.map((r) => r.team.id))
  ).size

  const stats = [
    {
      label: 'Total Lobby',
      value: lobbies.length,
      icon: Target,
    },
    {
      label: 'Selesai',
      value: completedCount,
      icon: Trophy,
    },
    {
      label: 'Tim Berpartisipasi',
      value: totalTeams,
      icon: Users,
    },
  ]

  return (
    <PublicLayout>
      <div ref={containerRef}>
        {/* Page header */}
        <PageHeader
          title="Hasil Lobby"
          description={`Hasil per-lobby untuk ${tournament.name}`}
          breadcrumbs={[
            { label: 'Turnamen', href: '/tournaments' },
            { label: tournament.name, href: `/tournaments/${params.id}` },
            { label: 'Hasil Lobby' },
          ]}
          actions={
            <Link
              href={`/tournaments/${params.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-900"
            >
              <ArrowLeft size={15} />
              Kembali
            </Link>
          }
        />

        {/* Stats row */}
        <div className="anim-header mb-6 grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-1.5 flex items-center gap-2 text-stone-500">
                <Icon size={15} className="text-porjar-red" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {label}
                </span>
              </div>
              <p className="text-xl font-bold text-stone-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Day filter tabs */}
        {uniqueDays.length > 1 && (
          <div className="anim-header mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveDay('all')}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                activeDay === 'all'
                  ? 'border-porjar-red bg-porjar-red text-white'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              )}
            >
              Semua
            </button>
            {uniqueDays.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  activeDay === day
                    ? 'border-porjar-red bg-porjar-red text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                )}
              >
                Hari {day}
              </button>
            ))}
          </div>
        )}

        {/* Lobby cards */}
        {filteredLobbies.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Belum Ada Lobby"
            description="Lobby untuk turnamen ini belum dibuat atau belum tersedia."
          />
        ) : (
          <div className="space-y-5">
            {filteredLobbies
              .sort((a, b) =>
                a.day_number !== b.day_number
                  ? a.day_number - b.day_number
                  : a.lobby_number - b.lobby_number
              )
              .map((lobby) => (
                <LobbyCard key={lobby.id} lobby={lobby} />
              ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
