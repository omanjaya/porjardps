'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarBlank,
  CheckCircle,
  ListBullets,
  Trophy,
} from '@phosphor-icons/react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { MatchResultFeed } from '@/components/modules/bracket/MatchResultFeed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BracketMatch } from '@/types'

import { useTournamentData } from './hooks/useTournamentData'
import { useLiveTournamentUpdates } from './hooks/useLiveTournamentUpdates'
import { TournamentHeader } from './components/TournamentHeader'
import {
  BracketTabContent,
  ScheduleTabContent,
  ResultsTabContent,
} from './components/BracketVisualization'
import { StandingsView } from './components/StandingsView'
import { PlayerMatchDetailSheet } from './components/MatchDetailSheet'
import { RulesTabContent } from './components/RulesModal'

export default function TournamentPage() {
  const {
    loading,
    teamId,
    tournamentId,
    tournament,
    matches,
    setMatches,
    standings,
    rulesContent,
    rulesLoading,
    loadTournamentData,
  } = useTournamentData()

  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { newMatchIds } = useLiveTournamentUpdates({
    tournamentId,
    setMatches,
    loadTournamentData,
  })

  const maxRound = useMemo(
    () => matches.reduce((max, m) => Math.max(max, m.round), 0),
    [matches]
  )

  const liveMatchIds = useMemo(
    () => matches.filter((m) => m.status === 'live').map((m) => m.id),
    [matches]
  )

  const liveCount = liveMatchIds.length

  const scheduledMatches = useMemo(() => {
    return matches
      .filter(
        (m) =>
          (m.status === 'pending' || m.status === 'scheduled') &&
          (m.team_a || m.team_b)
      )
      .sort((a, b) => {
        if (a.scheduled_at && b.scheduled_at) {
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        }
        if (a.scheduled_at) return -1
        if (b.scheduled_at) return 1
        return a.round - b.round || a.match_number - b.match_number
      })
  }, [matches])

  const completedMatches = useMemo(() => {
    return matches
      .filter((m) => m.status === 'completed' && m.winner)
      .sort((a, b) => {
        if (a.completed_at && b.completed_at) {
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        }
        if (a.completed_at) return -1
        if (b.completed_at) return 1
        return b.match_number - a.match_number
      })
  }, [matches])

  function handleMatchClick(matchId: string) {
    const match = matches.find((m) => m.id === matchId)
    if (match) {
      setSelectedMatch(match)
      setSheetOpen(true)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Turnamen Saya"
        description={
          tournament
            ? `${tournament.name} - ${tournament.format.replace(/_/g, ' ')} | BO${tournament.best_of}`
            : 'Lihat bracket dan posisi tim kamu di turnamen'
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : !tournamentId || !tournament ? (
        <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <EmptyState
            icon={Trophy}
            title="Belum ada turnamen"
            description="Tim kamu belum terdaftar di turnamen manapun. Hubungi pelatih atau panitia untuk informasi lebih lanjut."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <TournamentHeader tournament={tournament} liveCount={liveCount} />

          <MatchResultFeed matches={matches} newMatchIds={newMatchIds} />

          <Tabs defaultValue="bracket" className="space-y-4">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="bracket" className="gap-1.5 text-xs sm:text-sm">
                <Trophy size={16} className="hidden sm:block" />
                Bracket
              </TabsTrigger>
              <TabsTrigger value="standings" className="gap-1.5 text-xs sm:text-sm">
                <ListBullets size={16} className="hidden sm:block" />
                Standings
              </TabsTrigger>
              <TabsTrigger value="jadwal" className="gap-1.5 text-xs sm:text-sm">
                <CalendarBlank size={16} className="hidden sm:block" />
                Jadwal
              </TabsTrigger>
              <TabsTrigger value="hasil" className="gap-1.5 text-xs sm:text-sm">
                <CheckCircle size={16} className="hidden sm:block" />
                Hasil
              </TabsTrigger>
              <TabsTrigger value="aturan" className="gap-1.5 text-xs sm:text-sm">
                <BookOpen size={16} className="hidden sm:block" />
                Aturan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bracket">
              <BracketTabContent
                matches={matches}
                maxRound={maxRound}
                tournament={tournament}
                liveMatchIds={liveMatchIds}
                teamId={teamId}
                onMatchClick={handleMatchClick}
              />
            </TabsContent>

            <TabsContent value="standings">
              <StandingsView standings={standings} teamId={teamId} />
            </TabsContent>

            <TabsContent value="jadwal">
              <ScheduleTabContent
                scheduledMatches={scheduledMatches}
                teamId={teamId}
                onMatchClick={handleMatchClick}
              />
            </TabsContent>

            <TabsContent value="hasil">
              <ResultsTabContent
                completedMatches={completedMatches}
                onMatchClick={handleMatchClick}
              />
            </TabsContent>

            <TabsContent value="aturan">
              <RulesTabContent rulesLoading={rulesLoading} rulesContent={rulesContent} />
            </TabsContent>
          </Tabs>

          <PlayerMatchDetailSheet
            match={selectedMatch}
            open={sheetOpen}
            onClose={() => {
              setSheetOpen(false)
              setSelectedMatch(null)
            }}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
