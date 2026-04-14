// To wire: <LiveScoreboardSection initialLiveMatches={liveMatches} />
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Lightning, ArrowRight } from '@phosphor-icons/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { WSMessage } from '@/types'

export type LiveMatch = {
  id: number
  tournamentName: string
  gameName?: string
  teamA: { name: string; logo?: string; score: number }
  teamB: { name: string; logo?: string; score: number }
  status: 'live' | 'paused'
  round?: string
}

interface LiveScoreboardSectionProps {
  initialLiveMatches: LiveMatch[]
}

function TeamBlock({ team, dim }: { team: LiveMatch['teamA']; dim?: boolean }) {
  return (
    <div className={cn('flex flex-1 flex-col items-center gap-2 text-center', dim && 'opacity-60')}>
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logo}
          alt={team.name}
          width={48}
          height={48}
          loading="lazy"
          className="h-12 w-12 rounded-full border border-white/20 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10">
          <Lightning size={20} weight="fill" className="text-white/60" />
        </div>
      )}
      <span className="line-clamp-2 text-xs font-bold leading-tight text-white">
        {team.name}
      </span>
      <span className="text-3xl font-black tabular-nums leading-none text-white sm:text-4xl lg:text-5xl">
        {team.score}
      </span>
    </div>
  )
}

function LiveMatchCard({ match }: { match: LiveMatch }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="live-score-card anim-card group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-esi-red to-red-700 p-5 shadow-[0_4px_24px_rgba(196,30,42,0.3)] transition-all duration-300 hover:brightness-110 dark:shadow-[0_4px_24px_rgba(196,30,42,0.25)]"
    >
      {/* Top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Header */}
      <div className="relative z-10 mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/80">
            {match.tournamentName}
          </p>
          {(match.round || match.gameName) && (
            <p className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-wider text-white/50">
              {[match.gameName, match.round].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-black/25 px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            {match.status === 'paused' ? 'Paused' : 'Live'}
          </span>
        </div>
      </div>

      {/* Teams + Score */}
      <div className="relative z-10 flex items-center gap-3">
        <TeamBlock team={match.teamA} dim={match.teamA.score < match.teamB.score} />
        <div className="flex shrink-0 items-center">
          <span className="text-2xl font-light text-white/30">vs</span>
        </div>
        <TeamBlock team={match.teamB} dim={match.teamB.score < match.teamA.score} />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </Link>
  )
}

export function LiveScoreboardSection({ initialLiveMatches }: LiveScoreboardSectionProps) {
  const [matches, setMatches] = useState<LiveMatch[]>(initialLiveMatches)

  // Keep in sync if SSR prop changes
  useEffect(() => {
    setMatches(initialLiveMatches)
  }, [initialLiveMatches])

  const handleWSMessage = useCallback((msg: WSMessage) => {
    const data = msg.data as Record<string, unknown> | undefined
    if (!data) return

    if (msg.type === 'score_update') {
      const id = Number(data.id ?? data.match_id)
      if (!id) return
      setMatches((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                teamA: { ...m.teamA, score: Number(data.score_a ?? m.teamA.score) },
                teamB: { ...m.teamB, score: Number(data.score_b ?? m.teamB.score) },
              }
            : m
        )
      )
      return
    }

    if (msg.type === 'match_status') {
      const id = Number(data.id ?? data.match_id)
      if (!id) return
      const status = data.status as string | undefined
      if (status === 'completed' || status === 'cancelled') {
        setMatches((prev) => prev.filter((m) => m.id !== id))
      }
      return
    }

    if (msg.type === 'match_complete') {
      const id = Number(data.match_id ?? data.id)
      if (!id) return
      setMatches((prev) => prev.filter((m) => m.id !== id))
    }
  }, [])

  useWebSocket({
    channels: ['live-scores'],
    onMessage: handleWSMessage,
    messageTypes: ['score_update', 'match_status', 'match_complete'],
  })

  const visible = matches.slice(0, 3)

  return (
    <section className="live-scoreboard-section py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-esi-red opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-esi-red" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-esi-red">
              Live
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-zinc-100">
            Skor Live
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
            Pantau pertandingan yang sedang berlangsung secara real-time
          </p>
        </div>
        <Link
          href="/matches/live"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-esi-red hover:text-esi-red dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-esi-red dark:hover:text-esi-red sm:inline-flex"
        >
          Lihat Semua
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Lightning}
          title="Tidak ada match live"
          description="Match yang sedang berlangsung akan muncul di sini"
          size="sm"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <LiveMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      {/* Mobile CTA */}
      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          href="/matches/live"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition-colors hover:border-esi-red hover:text-esi-red dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          Lihat Semua Match Live
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>
      </div>
    </section>
  )
}

export default LiveScoreboardSection
