'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sword,
  Trophy,
  Clock,
  Lightning,
  ArrowCounterClockwise,
  CaretRight,
  ArrowRight,
} from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { getLiveScoreClient } from '@/lib/ws'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import type { BracketMatch, TeamMember } from '@/types'
import {
  PlayerHeader,
  CurrentMatchCard,
  BracketPosition,
  MatchHistory,
  MatchHistoryCard,
  SubmissionStatusSection,
  TeamCardsSection,
} from './MyMatchesComponents'
import type { MyTeamInfo, SubmissionStatus } from './MyMatchesComponents'

interface MyMatchData {
  team: MyTeamInfo | null
  current_match: BracketMatch | null
  upcoming_matches: BracketMatch[]
  past_matches: BracketMatch[]
  bracket_path: string[]
  submissions: SubmissionStatus[]
}

export default function MyMatchesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [data, setData] = useState<MyMatchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liveAlert, setLiveAlert] = useState<string | null>(null)
  const [hasAnyTeam, setHasAnyTeam] = useState<boolean>(false)

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading])

  // WebSocket: reload when match_starting or match_status=live notification arrives
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    const ws = getLiveScoreClient()
    // P2: Capture userId in closure to prevent subscription leak on user change
    const userId = user.id
    const room = `user#${userId}`
    ws.connect()
    ws.subscribe(room)

    const unsub = ws.on('notification', (msg) => {
      const notif = msg.data as { type: string; title?: string }
      if (notif?.type === 'match_starting') {
        setLiveAlert(notif.title ?? 'Pertandinganmu dimulai!')
        loadData()
      }
    })

    return () => {
      unsub()
      ws.unsubscribe(room)
    }
  }, [isAuthenticated, user?.id])

  // Reload on page visibility (user navigates back from notification)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.get<MyMatchData>('/player/my-matches')
      setData(result)
      if (!result.team) {
        try {
          const teams = await api.get<unknown[]>('/teams/my')
          setHasAnyTeam(Array.isArray(teams) && teams.length > 0)
        } catch {
          setHasAnyTeam(false)
        }
      } else {
        setHasAnyTeam(true)
      }
    } catch {
      setError('Gagal memuat data pertandingan. Periksa koneksi internet kamu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="space-y-6">
          {/* Skeleton breadcrumb */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-2 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          {/* Skeleton match cards */}
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-6 space-y-4">
              <Skeleton className="h-5 w-40 rounded" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-zinc-400">
            <Link href="/dashboard" className="hover:text-esi-red transition-colors">Dashboard</Link>
            <CaretRight size={12} />
            <span className="text-stone-900 dark:text-zinc-100 font-medium">Pertandingan</span>
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-6 text-center">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => loadData()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-esi-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
              >
                <ArrowCounterClockwise size={14} weight="bold" />
                Coba Lagi
              </button>
            </div>
          )}

          {/* Player Header */}
          {!error && <PlayerHeader user={user} team={data?.team ?? null} />}

          {/* Live alert banner */}
          {liveAlert && (
            <button
              onClick={() => setLiveAlert(null)}
              className="flex w-full items-center gap-3 rounded-xl border border-esi-red/40 bg-red-50 dark:bg-red-950/30 p-4 text-left animate-pulse"
            >
              <Lightning size={22} weight="fill" className="shrink-0 text-esi-red" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{liveAlert}</p>
                <p className="text-xs text-red-600 dark:text-red-400">Pertandinganmu sedang berlangsung sekarang!</p>
              </div>
              <span className="text-xs text-red-400">✕</span>
            </button>
          )}

          {/* Current/Next Match */}
          {!error && data?.team ? (
            <>
              <CurrentMatchCard
                match={data.current_match}
                team={data.team}
              />

              {/* Bracket Position */}
              {(data.bracket_path ?? []).length > 0 && (
                <BracketPosition path={data.bracket_path} />
              )}

              {/* Upcoming Matches */}
              {(data.upcoming_matches ?? []).length > 0 && (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-esi-text">
                    <Clock size={20} weight="bold" />
                    Pertandingan Mendatang
                  </h2>
                  <div className="space-y-3">
                    {(data.upcoming_matches ?? []).map((match) => (
                      <MatchHistoryCard
                        key={match.id}
                        match={match}
                        myTeamId={data.team!.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Match History */}
              <MatchHistory
                matches={data.past_matches ?? []}
                myTeamId={data.team.id}
              />

              {/* Submission Status */}
              {(data.submissions ?? []).length > 0 && (
                <SubmissionStatusSection submissions={data.submissions ?? []} />
              )}

              {/* Team Cards */}
              <TeamCardsSection teamId={data.team.id} />
            </>
          ) : !error ? (
            <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <EmptyState
                icon={Trophy}
                title="Belum ada pertandingan"
                description={
                  hasAnyTeam
                    ? 'Pertandingan akan muncul setelah tim kamu terjadwal di turnamen.'
                    : 'Buat tim dulu untuk mendapat pertandingan.'
                }
              />
              <div className="mt-4 flex justify-center">
                <Link
                  href={hasAnyTeam ? '/events' : '/dashboard/teams/create'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-esi-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
                >
                  {hasAnyTeam ? 'Lihat Event' : 'Buat Tim'}
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardLayout>
  )
}
