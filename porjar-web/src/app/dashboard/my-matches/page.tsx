'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sword,
  Clock,
  ArrowRight,
  WarningCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { BracketMatch, TeamMember } from '@/types'
import {
  PlayerHeader,
  CurrentMatchCard,
  BracketPosition,
  MatchHistory,
  MatchHistoryCard,
  SubmissionStatusSection,
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

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading])

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.get<MyMatchData>('/player/my-matches')
      setData(result)
    } catch {
      toast.error('Gagal memuat data')
      setData({
        team: null,
        current_match: null,
        upcoming_matches: [],
        past_matches: [],
        bracket_path: [],
        submissions: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Player Header */}
          <PlayerHeader user={user} team={data?.team ?? null} />

          {/* Needs password change banner */}
          {user?.needs_password_change && (
            <Link
              href="/dashboard/change-password"
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-all hover:border-amber-300 hover:shadow-sm"
            >
              <WarningCircle size={24} weight="fill" className="shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Ubah password default kamu</p>
                <p className="text-xs text-amber-700">Demi keamanan, segera ubah password NISN kamu</p>
              </div>
              <ArrowRight size={18} className="text-amber-600" />
            </Link>
          )}

          {/* Current/Next Match */}
          {data?.team ? (
            <>
              <CurrentMatchCard
                match={data.current_match}
                team={data.team}
              />

              {/* Bracket Position */}
              {data.bracket_path.length > 0 && (
                <BracketPosition path={data.bracket_path} />
              )}

              {/* Upcoming Matches */}
              {data.upcoming_matches.length > 0 && (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-porjar-text">
                    <Clock size={20} weight="bold" />
                    Pertandingan Mendatang
                  </h2>
                  <div className="space-y-3">
                    {data.upcoming_matches.map((match) => (
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
                matches={data.past_matches}
                myTeamId={data.team.id}
              />

              {/* Submission Status */}
              {data.submissions.length > 0 && (
                <SubmissionStatusSection submissions={data.submissions} />
              )}
            </>
          ) : (
            <div className="rounded-xl border border-porjar-border bg-white p-6 shadow-sm">
              <EmptyState
                icon={Sword}
                title="Belum ada pertandingan"
                description="Kamu belum terdaftar di tim manapun. Hubungi panitia atau guru pembina untuk informasi lebih lanjut."
              />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
