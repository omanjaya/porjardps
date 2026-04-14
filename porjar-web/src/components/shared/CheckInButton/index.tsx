'use client'

// Expected backend endpoint (to be implemented):
// POST /api/v1/matches/:id/check-in
// Body: { team_side: 'a' | 'b' }
// Returns: { success: true, checked_in_at: '...' }
// If 404: feature not implemented, gracefully disable

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Lightning, CheckCircle } from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'

interface CheckInButtonProps {
  matchId: string | number
  teamSide: 'a' | 'b'
  matchStatus: string
  scheduledAt: string | null
  onSuccess?: () => void
}

type UiState =
  | { kind: 'early'; minutes: number }
  | { kind: 'closed' }
  | { kind: 'ready' }
  | { kind: 'done' }
  | { kind: 'unavailable' }

const CHECKIN_WINDOW_MS = 30 * 60 * 1000

export function CheckInButton({
  matchId,
  teamSide,
  matchStatus,
  scheduledAt,
  onSuccess,
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const state: UiState = useMemo(() => {
    if (checkedIn) return { kind: 'done' }
    if (unavailable) return { kind: 'unavailable' }

    const status = (matchStatus || '').toLowerCase()
    const isOpenStatus = status === 'scheduled' || status === 'upcoming' || status === 'pending' || status === 'live'
    if (!isOpenStatus) return { kind: 'closed' }

    if (status === 'live') return { kind: 'ready' }

    if (!scheduledAt) return { kind: 'ready' }
    const target = new Date(scheduledAt).getTime()
    if (Number.isNaN(target)) return { kind: 'ready' }

    const now = Date.now()
    const diff = target - now
    // Past match (>2h after scheduled time = closed)
    if (diff < -2 * 60 * 60 * 1000) return { kind: 'closed' }
    // Too early
    if (diff > CHECKIN_WINDOW_MS) {
      return { kind: 'early', minutes: Math.ceil((diff - CHECKIN_WINDOW_MS) / 60000) }
    }
    return { kind: 'ready' }
  }, [matchStatus, scheduledAt, checkedIn, unavailable])

  async function handleCheckIn() {
    if (loading || state.kind !== 'ready') return
    setLoading(true)
    try {
      await api.post(`/matches/${matchId}/check-in`, { team_side: teamSide })
      setCheckedIn(true)
      toast.success('Check-in berhasil! Panitia sudah diberitahu.')
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError) {
        // Treat NOT_FOUND / 404-like codes as "feature not implemented"
        const code = (err.code || '').toUpperCase()
        if (code.includes('NOT_FOUND') || code === 'NOT_IMPLEMENTED' || code === 'ROUTE_NOT_FOUND') {
          setUnavailable(true)
          toast.info('Fitur check-in belum tersedia. Hubungi panitia di venue.')
        } else if (code === 'ALREADY_CHECKED_IN' || code === 'CONFLICT') {
          setCheckedIn(true)
          toast.success('Kamu sudah check-in sebelumnya.')
        } else {
          toast.error(err.message || 'Gagal check-in')
        }
      } else {
        toast.error('Gagal check-in. Periksa koneksi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const baseClass =
    'w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 font-bold text-sm shadow-sm transition-all min-h-[56px] touch-manipulation'

  if (state.kind === 'done') {
    return (
      <button
        disabled
        className={`${baseClass} bg-green-600 text-white cursor-default opacity-90`}
      >
        <CheckCircle size={22} weight="fill" />
        Kamu sudah check-in
      </button>
    )
  }

  if (state.kind === 'unavailable') {
    return (
      <button
        disabled
        className={`${baseClass} border border-esi-border bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 cursor-not-allowed`}
      >
        Check-in belum tersedia — hubungi panitia
      </button>
    )
  }

  if (state.kind === 'closed') {
    return (
      <button
        disabled
        className={`${baseClass} border border-esi-border bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 cursor-not-allowed`}
      >
        Check-in ditutup
      </button>
    )
  }

  if (state.kind === 'early') {
    return (
      <button
        disabled
        className={`${baseClass} border border-esi-border bg-stone-50 dark:bg-zinc-800/60 text-stone-500 dark:text-zinc-400 cursor-not-allowed`}
        title={`Dibuka dalam ${state.minutes} menit`}
      >
        Check-in dibuka 30 menit sebelum match
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleCheckIn}
      disabled={loading}
      className={`${baseClass} bg-esi-red text-white hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait ring-2 ring-esi-red/30`}
    >
      <Lightning size={22} weight="fill" />
      {loading ? 'Memproses...' : 'CHECK-IN SEKARANG'}
    </button>
  )
}

export default CheckInButton
