'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { PageHeader } from '@/components/shared/PageHeader'
import { LiveScoreCard } from '@/components/modules/match/LiveScoreCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightning, Trophy } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { BracketMatch, Game, WSMessage, TournamentStatus } from '@/types'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { toast } from 'sonner'

export default function LiveMatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [recentMatches, setRecentMatches] = useState<BracketMatch[]>([])
  const [newIds, setNewIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [gameFilter, setGameFilter] = useState<string>('all')

  const pendingUpdatesRef = useRef<WSMessage[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading, matches.length, recentMatches.length])

  useEffect(() => {
    async function load() {
      try {
        const [live, recent] = await Promise.all([
          api.get<BracketMatch[]>('/matches/live'),
          api.get<BracketMatch[]>('/matches/recent?limit=20'),
        ])
        setMatches(live ?? [])
        setRecentMatches(recent ?? [])
      } catch (err) {
        console.error('Gagal memuat matches:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    api.get<Game[]>('/games').then(g => setGames(g ?? [])).catch(() => { toast.error('Gagal memuat data game') })
  }, [])

  const flushUpdates = useCallback(() => {
    const pending = pendingUpdatesRef.current
    if (pending.length === 0) return
    pendingUpdatesRef.current = []

    setMatches((prev) => {
      let next = [...prev]
      for (const msg of pending) {
        if (msg.type === 'score_update') {
          const update = msg.data as BracketMatch
          const idx = next.findIndex((m) => m.id === update.id)
          if (idx >= 0) next[idx] = update
          else next = [...next, update]
        }
        if (msg.type === 'match_status') {
          const update = msg.data as BracketMatch
          if (update.status === 'completed') next = next.filter((m) => m.id !== update.id)
          else if (update.status === 'live' && !next.some((m) => m.id === update.id)) next = [...next, update]
        }
      }
      return next
    })
  }, [])

  const recentMatchesRef = useRef<BracketMatch[]>([])
  // Keep ref in sync with state for use inside WS callback without stale closure
  useEffect(() => { recentMatchesRef.current = recentMatches }, [recentMatches])

  const handleWSMessage = useCallback((msg: WSMessage) => {
    // match_complete: prepend to recent results feed with flash
    if (msg.type === 'match_complete') {
      const data = msg.data as Record<string, unknown>
      const matchId = data?.match_id as string | undefined
      if (!matchId) return

      // Skip if this match already exists in recent results (duplicate WS message)
      if (recentMatchesRef.current.some((m) => m.id === matchId)) {
        // Still remove from live list in case it's lingering
        setMatches((prev) => prev.filter((m) => m.id !== matchId))
        return
      }

      // Build a synthetic BracketMatch for the card, using WS data when available
      const synthetic: BracketMatch = {
        id: matchId,
        tournament_id: (data.tournament_id as string) || '',
        round: (data.round as number) ?? 0,
        match_number: (data.match_number as number) ?? 0,
        bracket_position: (data.bracket_position as string) ?? null,
        team_a: data.winner_name ? { id: data.winner_id as string, name: data.winner_name as string, logo_url: (data.winner_logo_url as string) ?? null, school_logo_url: (data.winner_school_logo_url as string) ?? null } : null,
        team_b: data.loser_name ? { id: data.loser_id as string, name: data.loser_name as string, logo_url: (data.loser_logo_url as string) ?? null, school_logo_url: (data.loser_school_logo_url as string) ?? null } : null,
        winner: data.winner_name ? { id: data.winner_id as string, name: data.winner_name as string, logo_url: (data.winner_logo_url as string) ?? null, school_logo_url: (data.winner_school_logo_url as string) ?? null } : null,
        score_a: (data.score_a as number) ?? 0,
        score_b: (data.score_b as number) ?? 0,
        status: 'completed',
        best_of: (data.best_of as number) ?? 1,
        scheduled_at: (data.scheduled_at as string) ?? null,
        started_at: (data.started_at as string) ?? null,
        completed_at: (data.completed_at as string) ?? new Date().toISOString(),
        next_match_id: (data.next_match_id as string) ?? null,
        loser_next_match_id: (data.loser_next_match_id as string) ?? null,
        stream_url: (data.stream_url as string) ?? null,
        tournament: data.tournament_name
          ? { id: (data.tournament_id as string) || '', name: data.tournament_name as string, status: ((data.tournament_status as string) || 'ongoing') as TournamentStatus }
          : undefined,
        games: [],
      }

      setRecentMatches((prev) => [synthetic, ...prev].slice(0, 20))
      setNewIds((prev) => [...prev, matchId])
      setTimeout(() => setNewIds((prev) => prev.filter((id) => id !== matchId)), 4000)

      // Also remove from live list
      setMatches((prev) => prev.filter((m) => m.id !== matchId))
      return
    }

    pendingUpdatesRef.current.push(msg)
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(flushUpdates, 500)
  }, [flushUpdates])

  useEffect(() => {
    return () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current) }
  }, [])

  useWebSocket({
    channels: ['live-scores'],
    onMessage: handleWSMessage,
    messageTypes: ['score_update', 'match_status', 'match_complete'],
  })

  // Filter matches by game
  // NOTE: BracketMatch/TournamentSummary don't include game_slug or game_id,
  // so we fall back to checking if the tournament name contains the game slug.
  // This is fragile — if the API adds game_slug to match data, use that instead.
  const matchesGameSlug = (match: BracketMatch, slug: string): boolean => {
    const name = match.tournament?.name?.toLowerCase() ?? ''
    return name.includes(slug.toLowerCase())
  }

  const filteredLive = gameFilter === 'all'
    ? matches
    : matches.filter(m => matchesGameSlug(m, gameFilter))

  const filteredRecent = gameFilter === 'all'
    ? recentMatches
    : recentMatches.filter(m => matchesGameSlug(m, gameFilter))

  return (
    <>
      <PageHeader
        title="Pertandingan Live"
        description="Skor real-time & hasil terkini — update otomatis"
      />

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="font-bold text-stone-800 dark:text-zinc-200">{matches.length}</span>
            <span className="text-stone-500 dark:text-zinc-400">Live</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy size={12} weight="fill" className="text-yellow-500" />
            <span className="font-bold text-stone-800 dark:text-zinc-200">{recentMatches.length}</span>
            <span className="text-stone-500 dark:text-zinc-400">Selesai</span>
          </div>
        </div>
      )}

      {/* Game filter */}
      {!loading && games.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setGameFilter('all')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              gameFilter === 'all'
                ? 'bg-esi-red text-white'
                : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
            )}
          >
            Semua
          </button>
          {games.map(g => (
            <button
              key={g.slug}
              onClick={() => setGameFilter(g.slug)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                gameFilter === g.slug
                  ? 'bg-esi-red text-white'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef}>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl bg-stone-200 dark:bg-zinc-700" />
          ))}
        </div>
      ) : (
        <>
          {/* Live matches */}
          {filteredLive.length > 0 && (
            <section className="anim-section mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-700 dark:text-zinc-300">Sedang Berlangsung</h2>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{filteredLive.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLive.map((match) => (
                  <div key={match.id} className="anim-card">
                    {match.tournament?.name && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 truncate">
                        {match.tournament.name}
                      </p>
                    )}
                    <LiveScoreCard match={match} onClick={(m) => router.push(`/matches/${m.id}`)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state for live */}
          {filteredLive.length === 0 && (
            <div className="mb-8 rounded-xl border border-dashed border-stone-200 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/30 p-8 text-center">
              <Lightning size={40} className="mx-auto mb-3 text-stone-300 dark:text-zinc-600" weight="duotone" />
              <p className="text-sm font-medium text-stone-500 dark:text-zinc-400">Tidak ada match live saat ini</p>
              <p className="mt-1 text-xs text-stone-400 dark:text-zinc-500">Match yang sedang berlangsung akan muncul di sini secara real-time</p>
            </div>
          )}

          {/* Recent results */}
          {filteredRecent.length > 0 && (
            <section className="anim-section">
              <div className="mb-3 flex items-center gap-2">
                <Trophy size={14} weight="fill" className="text-yellow-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-700 dark:text-zinc-300">Hasil Terkini</h2>
                <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:text-zinc-400">{filteredRecent.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRecent.map((match) => (
                  <div key={match.id} className="anim-card">
                    <CompletedMatchCard
                      match={match}
                      isNew={newIds.includes(match.id)}
                      onClick={() => router.push(`/matches/${match.id}`)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      </div>
    </>
  )
}

function TeamAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
        <img src={logoUrl} alt={name} width={40} height={40} loading="lazy" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
      <Lightning size={18} className="text-white/50" weight="fill" />
    </div>
  )
}

function CompletedMatchCard({
  match,
  isNew,
  onClick,
}: {
  match: BracketMatch
  isNew: boolean
  onClick: () => void
}) {
  const winner = match.winner
  const isTeamAWinner = winner?.id === match.team_a?.id

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl text-left shadow-lg transition-all duration-300 hover:brightness-110',
        isNew ? 'shadow-[0_0_28px_rgba(234,179,8,0.25)]' : 'shadow-[0_4px_24px_rgba(196,30,42,0.3)]'
      )}
      style={{ background: isNew ? '#b45309' : '#C41E2A' }}
    >
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            {match.round > 0 && match.match_number > 0
              ? `Round ${match.round} · Match #${match.match_number}`
              : match.round > 0 ? `Round ${match.round}` : 'Selesai'}
          </span>
          <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-2.5 py-1">
            <Trophy size={10} weight="fill" className="text-white/80" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Selesai</span>
          </div>
        </div>

        {/* Teams + Score — same layout as LiveScoreCard */}
        <div className="flex items-center gap-3">
          {/* Team A */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamAvatar name={match.team_a?.name ?? 'TBD'} logoUrl={match.team_a?.logo_url} />
            <span className={cn('line-clamp-2 text-xs font-bold leading-tight', isTeamAWinner ? 'text-white' : 'text-white/30')}>
              {match.team_a?.name ?? 'TBD'}
            </span>
          </div>

          {/* Score */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-5xl font-black tabular-nums leading-none', isTeamAWinner ? 'text-white' : 'text-white/30')}>
                {match.score_a}
              </span>
              <span className="text-2xl font-light text-white/20">—</span>
              <span className={cn('text-5xl font-black tabular-nums leading-none', !isTeamAWinner ? 'text-white' : 'text-white/30')}>
                {match.score_b}
              </span>
            </div>
            {match.tournament?.name && (
              <span className="mt-1 max-w-[120px] truncate text-center text-[9px] font-semibold uppercase tracking-wider text-white/20">
                {match.tournament.name}
              </span>
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <TeamAvatar name={match.team_b?.name ?? 'TBD'} logoUrl={match.team_b?.logo_url} />
            <span className={cn('line-clamp-2 text-xs font-bold leading-tight', !isTeamAWinner ? 'text-white' : 'text-white/30')}>
              {match.team_b?.name ?? 'TBD'}
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {winner && (
            <div className="flex items-center gap-1 rounded-full bg-black/20 border border-white/20 px-2.5 py-0.5">
              <Trophy size={9} weight="fill" className="text-white/80" />
              <span className="text-[10px] font-semibold text-white/90">{winner.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </button>
  )
}
