'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { BracketMatch, Standing, Tournament } from '@/types'

interface MyMatchData {
  team: {
    id: string
    name: string
    game_name: string
    game_slug: string
    school_name: string
  } | null
  current_match: BracketMatch | null
  upcoming_matches: BracketMatch[]
  past_matches: BracketMatch[]
}

export function useTournamentData() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [gameSlug, setGameSlug] = useState<string | null>(null)
  const [rulesContent, setRulesContent] = useState<string | null>(null)
  const [rulesLoading, setRulesLoading] = useState(false)

  // Step 1: Get the player's team & tournament_id from my-matches
  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    async function loadPlayerData() {
      try {
        const result = await api.get<MyMatchData>('/player/my-matches')
        if (result.team) {
          setTeamId(result.team.id)
          if (result.team.game_slug) {
            setGameSlug(result.team.game_slug)
          }
        }

        const allMatches = [
          result.current_match,
          ...(result.upcoming_matches ?? []),
          ...(result.past_matches ?? []),
        ].filter(Boolean) as BracketMatch[]

        if (allMatches.length > 0) {
          setTournamentId(allMatches[0].tournament_id)
        } else {
          setLoading(false)
        }
      } catch {
        toast.error('Gagal memuat data tim')
        setLoading(false)
      }
    }
    loadPlayerData()
  }, [isAuthenticated, authLoading])

  // Load game rules when gameSlug is available (lazy)
  useEffect(() => {
    if (!gameSlug) return
    setRulesLoading(true)
    api
      .get<{ id: string; game_id: string; content: string; updated_at: string }>(
        `/games/${gameSlug}/rules`
      )
      .then((result) => {
        setRulesContent(result.content ?? null)
      })
      .catch(() => {
        setRulesContent(null)
      })
      .finally(() => {
        setRulesLoading(false)
      })
  }, [gameSlug])

  // Step 2: Once we have tournament_id, load bracket + standings
  const loadTournamentData = useCallback(async () => {
    if (!tournamentId) return
    try {
      const [bracketResult, standingsResult] = await Promise.all([
        api.get<{ tournament: Tournament; matches: BracketMatch[] }>(
          `/tournaments/${tournamentId}/with-bracket`
        ),
        api.get<Standing[]>(`/tournaments/${tournamentId}/standings`).catch(() => [] as Standing[]),
      ])

      setTournament(bracketResult.tournament)
      setMatches(bracketResult.matches ?? [])
      setStandings(standingsResult ?? [])
    } catch {
      toast.error('Gagal memuat data turnamen')
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    if (tournamentId) {
      loadTournamentData()
    }
  }, [tournamentId, loadTournamentData])

  return {
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
  }
}
