'use client'

import { useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Users } from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { CheckInButton } from '@/components/shared/CheckInButton'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { BracketMatch } from '@/types'

// Extend BracketMatch locally for optional venue (may or may not be in payload)
type MatchWithVenue = BracketMatch & { venue?: string | null }

interface MyMatchPayload {
  team: { id: string; name: string; captain_id?: string | null } | null
}

export default function CheckInPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const user = useAuthStore((s) => s.user)

  const [match, setMatch] = useState<MatchWithVenue | null>(null)
  const [myTeamId, setMyTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  async function loadMatch() {
    try {
      const data = await api.get<MatchWithVenue>(`/matches/${matchId}`)
      setMatch(data)
      setError(null)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Gagal memuat data pertandingan')
    } finally {
      setLoading(false)
    }
  }

  async function loadMyTeam() {
    try {
      const data = await api.get<MyMatchPayload>('/player/my-matches')
      setMyTeamId(data?.team?.id ?? null)
    } catch {
      setMyTeamId(null)
    }
  }

  useEffect(() => {
    loadMatch()
    loadMyTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  // Auto-refresh every 10s
  useEffect(() => {
    const id = setInterval(() => {
      loadMatch()
      setTick((t) => t + 1)
    }, 10000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  const teamSide: 'a' | 'b' | null = useMemo(() => {
    if (!match || !myTeamId) return null
    if (match.team_a?.id === myTeamId) return 'a'
    if (match.team_b?.id === myTeamId) return 'b'
    return null
  }, [match, myTeamId])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !match) {
    return (
      <DashboardLayout>
        <div className="p-4">
          <ErrorState
            title="Gagal memuat match"
            message={error || 'Match tidak ditemukan'}
            onRetry={loadMatch}
          />
        </div>
      </DashboardLayout>
    )
  }

  const scheduled = match.scheduled_at ? new Date(match.scheduled_at) : null
  const venue = match.venue || '—'

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg p-4 pb-24">
        <Link
          href="/dashboard/my-matches"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-esi-muted hover:text-esi-red"
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>

        <div className="rounded-2xl border-2 border-esi-red/30 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          <div className="bg-esi-red px-5 py-3 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
              Check-in Pertandingan
            </p>
            <p className="text-sm font-bold">
              Round {match.round} · Match {match.match_number}
            </p>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-center gap-3">
              <div className="min-w-0 flex-1 text-center">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-esi-red/10">
                  <span className="text-xl font-bold text-esi-red">
                    {match.team_a?.name?.charAt(0) ?? '?'}
                  </span>
                </div>
                <p className="text-sm font-bold text-esi-text line-clamp-2 leading-tight">
                  {match.team_a?.name ?? 'TBD'}
                </p>
              </div>
              <div className="shrink-0 px-2 text-xl font-bold text-stone-400 dark:text-zinc-500">
                VS
              </div>
              <div className="min-w-0 flex-1 text-center">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800">
                  <span className="text-xl font-bold text-stone-500 dark:text-zinc-400">
                    {match.team_b?.name?.charAt(0) ?? '?'}
                  </span>
                </div>
                <p className="text-sm font-bold text-esi-text line-clamp-2 leading-tight">
                  {match.team_b?.name ?? 'TBD'}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <StatusBadge status={match.status} />
            </div>

            <div className="rounded-xl border border-esi-border bg-esi-bg divide-y divide-esi-border text-sm">
              <div className="flex items-center gap-3 px-4 py-3">
                <Clock size={18} className="text-esi-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-esi-muted">Waktu</p>
                  <p className="font-semibold text-esi-text truncate">
                    {scheduled
                      ? scheduled.toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Belum dijadwalkan'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin size={18} className="text-esi-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-esi-muted">Venue</p>
                  <p className="font-semibold text-esi-text truncate">{venue}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Users size={18} className="text-esi-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-esi-muted">Akun</p>
                  <p className="font-semibold text-esi-text truncate">
                    {user?.full_name || 'Tamu'}
                  </p>
                </div>
              </div>
            </div>

            {scheduled && match.status !== 'live' && match.status !== 'completed' && (
              <div className="rounded-xl bg-esi-bg p-4 text-center">
                <CountdownTimer
                  key={`cd-${tick}`}
                  targetDate={match.scheduled_at!}
                  label="Mulai dalam"
                  size="md"
                />
              </div>
            )}

            {teamSide ? (
              <CheckInButton
                matchId={match.id}
                teamSide={teamSide}
                matchStatus={match.status}
                scheduledAt={match.scheduled_at}
                onSuccess={loadMatch}
              />
            ) : (
              <div className="rounded-xl border border-esi-border bg-stone-50 dark:bg-zinc-800/50 p-4 text-center text-xs text-esi-muted">
                Kamu tidak terdaftar di salah satu tim pada match ini.
              </div>
            )}

            <p className="text-center text-[11px] text-stone-400 dark:text-zinc-500">
              Halaman ini auto-refresh tiap 10 detik.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
