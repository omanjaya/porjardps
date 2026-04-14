'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Sword } from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'

interface MatchCountdownBannerProps {
  nextMatch: BracketMatch | null | undefined
}

export function MatchCountdownBanner({ nextMatch }: MatchCountdownBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!nextMatch?.scheduled_at) {
      setRemaining(null)
      return
    }

    // Don't show for live or completed matches
    if (nextMatch.status === 'live' || nextMatch.status === 'completed' || nextMatch.status === 'bye') {
      setRemaining(null)
      return
    }

    function calcRemaining() {
      const target = new Date(nextMatch!.scheduled_at!).getTime()
      const now = Date.now()
      const diff = target - now
      return diff
    }

    const diff = calcRemaining()
    // Only show if within 60 minutes and in the future
    if (diff <= 0 || diff > 60 * 60 * 1000) {
      setRemaining(null)
      return
    }

    setRemaining(diff)

    intervalRef.current = setInterval(() => {
      const d = calcRemaining()
      if (d <= 0) {
        setRemaining(null)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else if (d > 60 * 60 * 1000) {
        setRemaining(null)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        setRemaining(d)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [nextMatch?.scheduled_at, nextMatch?.status])

  if (dismissed || remaining === null) return null

  const totalSecs = Math.floor(remaining / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div className="animate-in slide-in-from-top duration-500 sticky top-14 z-30 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-lg">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 dark:bg-zinc-100" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white dark:bg-zinc-100" />
          </span>

          <Sword size={18} weight="bold" className="shrink-0" />

          <span className="text-sm font-semibold truncate">
            Match dimulai dalam{' '}
            <span className="font-mono font-bold tabular-nums">{display}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/my-matches"
            className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 dark:bg-zinc-100/20 dark:hover:bg-zinc-100/30 transition-colors"
          >
            Lihat Match
          </Link>

          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 hover:bg-white/20 dark:hover:bg-zinc-100/20 transition-colors"
            aria-label="Tutup banner"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}
