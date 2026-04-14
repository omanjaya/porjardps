'use client'

import { useCallback, useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Users, CheckCircle, WifiSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
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

interface OfflineCheckIn {
  match_id: string | number
  team_side: 'a' | 'b'
  queued_at: string
}

const OFFLINE_QUEUE_KEY = 'offline_checkins'
const OFFLINE_QUEUE_MAX = 10

export default function CheckInPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const user = useAuthStore((s) => s.user)

  const [match, setMatch] = useState<MatchWithVenue | null>(null)
  const [myTeamId, setMyTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // --- (2) Online/offline detection ---
  const [online, setOnline] = useState(true)
  useEffect(() => {
    if (typeof navigator !== 'undefined') setOnline(navigator.onLine)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // --- (1) Wake Lock — keep screen on during check-in ---
  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null
    let released = false

    async function requestWakeLock() {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
        }
        if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
          wakeLock = await nav.wakeLock.request('screen')
        }
      } catch {
        // Browser doesn't support it or user denied — graceful fallback
      }
    }

    requestWakeLock()

    // Re-acquire when page becomes visible again (some browsers auto-release)
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      wakeLock?.release().catch(() => {})
    }
  }, [])

  // --- Success state (5) ---
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null)

  const loadMatch = useCallback(async () => {
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
  }, [matchId])

  const loadMyTeam = useCallback(async () => {
    try {
      const data = await api.get<MyMatchPayload>('/player/my-matches')
      setMyTeamId(data?.team?.id ?? null)
    } catch {
      setMyTeamId(null)
    }
  }, [])

  useEffect(() => {
    loadMatch()
    loadMyTeam()
  }, [loadMatch, loadMyTeam])

  // Auto-refresh every 10s (skip when offline to avoid toast spam)
  useEffect(() => {
    if (!online) return
    const id = setInterval(() => {
      loadMatch()
      setTick((t) => t + 1)
    }, 10000)
    return () => clearInterval(id)
  }, [online, loadMatch])

  const teamSide: 'a' | 'b' | null = useMemo(() => {
    if (!match || !myTeamId) return null
    if (match.team_a?.id === myTeamId) return 'a'
    if (match.team_b?.id === myTeamId) return 'b'
    return null
  }, [match, myTeamId])

  // --- (3) Flush offline queue when back online ---
  useEffect(() => {
    if (!online) return
    let cancelled = false

    async function flush() {
      let queue: OfflineCheckIn[] = []
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
        queue = raw ? JSON.parse(raw) : []
      } catch {
        localStorage.removeItem(OFFLINE_QUEUE_KEY)
        return
      }
      if (!Array.isArray(queue) || queue.length === 0) return

      const remaining: OfflineCheckIn[] = []
      let successCount = 0
      for (const q of queue) {
        try {
          await api.post(`/matches/${q.match_id}/check-in`, { team_side: q.team_side })
          successCount++
          // Match current page's check-in?
          if (String(q.match_id) === String(matchId)) {
            if (!cancelled) setCheckedInAt(q.queued_at)
          }
        } catch (e) {
          // Already checked in = success (idempotent)
          if (e instanceof ApiError) {
            const code = (e.code || '').toUpperCase()
            if (code === 'ALREADY_CHECKED_IN' || code === 'CONFLICT') {
              successCount++
              if (String(q.match_id) === String(matchId) && !cancelled) {
                setCheckedInAt(q.queued_at)
              }
              continue
            }
            // Client errors: drop from queue (won't succeed on retry)
            if (
              code.includes('NOT_FOUND') ||
              code === 'FORBIDDEN' ||
              code === 'UNAUTHORIZED' ||
              code === 'VALIDATION_ERROR'
            ) {
              continue
            }
          }
          // Network / 5xx — keep in queue for next attempt
          remaining.push(q)
        }
      }

      if (cancelled) return
      if (remaining.length === 0) {
        localStorage.removeItem(OFFLINE_QUEUE_KEY)
      } else {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining))
      }
      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'Check-in berhasil dikirim'
            : `${successCount} check-in berhasil dikirim`
        )
        loadMatch()
      }
    }

    flush()
    return () => {
      cancelled = true
    }
  }, [online, matchId, loadMatch])

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

  // --- (5) Success confirmation view ---
  if (checkedInAt) {
    const checkedDate = new Date(checkedInAt)
    const qrData = encodeURIComponent(
      JSON.stringify({
        match_id: match.id,
        team_side: teamSide,
        at: checkedInAt,
        user: user?.id ?? null,
      })
    )
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`

    return (
      <DashboardLayout>
        {!online && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-xs font-semibold z-50 flex items-center justify-center gap-2">
            <WifiSlash size={14} weight="fill" />
            Kamu sedang offline. Check-in akan dikirim saat kembali online.
          </div>
        )}
        <div className="mx-auto max-w-lg p-4 pb-24">
          <Link
            href="/dashboard/my-matches"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-esi-muted hover:text-esi-red"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>

          <div className="rounded-2xl border-2 border-green-500/40 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-green-500 to-green-600 px-5 py-8 text-white text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <CheckCircle size={64} weight="fill" className="text-white" />
              </div>
              <h1 className="text-2xl font-bold">Kamu berhasil check-in</h1>
              <p className="mt-2 text-sm opacity-90">Tunggu panggilan untuk bertanding</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-esi-border bg-esi-bg p-4 text-center">
                <p className="text-[11px] uppercase tracking-wide text-esi-muted mb-1">
                  Waktu check-in
                </p>
                <p className="font-bold text-esi-text text-lg tabular-nums">
                  {checkedDate.toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>

              <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wide text-esi-muted mb-2">
                  Tunjukkan ke wasit
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR code check-in"
                  className="mx-auto h-40 w-40 rounded-lg border border-esi-border bg-white p-1"
                  loading="lazy"
                />
                <p className="mt-2 text-[11px] text-esi-muted">
                  Match {match.match_number} · Round {match.round}
                </p>
              </div>

              <div className="rounded-xl border border-esi-border bg-esi-bg divide-y divide-esi-border text-sm">
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
                    <p className="text-[11px] uppercase tracking-wide text-esi-muted">Tim kamu</p>
                    <p className="font-semibold text-esi-text truncate">
                      {teamSide === 'a' ? match.team_a?.name : match.team_b?.name}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] text-stone-400 dark:text-zinc-500 pt-2">
                Jangan tutup halaman ini sampai panitia memanggil kamu.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* (2) Offline banner */}
      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-xs font-semibold z-50 flex items-center justify-center gap-2 px-3"
        >
          <WifiSlash size={14} weight="fill" className="shrink-0" />
          <span>Kamu sedang offline. Check-in akan disimpan saat kembali online.</span>
        </div>
      )}

      <div className={`mx-auto max-w-lg p-4 pb-24 ${!online ? 'pt-12' : ''}`}>
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
                offline={!online}
                onSuccess={(ts) => setCheckedInAt(ts)}
                onOfflineQueue={() => {
                  // Keep user on the page; confirmation will show when queue flushes.
                }}
              />
            ) : (
              <div className="rounded-xl border border-esi-border bg-stone-50 dark:bg-zinc-800/50 p-4 text-center text-xs text-esi-muted">
                Kamu tidak terdaftar di salah satu tim pada match ini.
              </div>
            )}

            <p className="text-center text-[11px] text-stone-400 dark:text-zinc-500">
              {online
                ? 'Halaman ini auto-refresh tiap 10 detik.'
                : 'Auto-refresh dijeda. Akan lanjut saat online.'}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
