'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Tournament, Standing, BracketMatch, BRLobby, TeamSummary } from '@/types'

export interface TournamentReportData {
  tournament: Tournament | null
  standings: Standing[]
  matches: BracketMatch[]
  lobbies: BRLobby[]
  teams: TeamSummary[]
  loading: boolean
  error: string | null
}

export function useTournamentReport(id: string): TournamentReportData {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [t, s, m, l, tm] = await Promise.all([
          api.get<Tournament>(`/tournaments/${id}`),
          api.get<Standing[]>(`/tournaments/${id}/standings`).catch(() => [] as Standing[]),
          api.get<BracketMatch[]>(`/tournaments/${id}/bracket`).catch(() => [] as BracketMatch[]),
          api.get<BRLobby[]>(`/tournaments/${id}/lobbies`).catch(() => [] as BRLobby[]),
          api.get<TeamSummary[]>(`/tournaments/${id}/teams`).catch(() => [] as TeamSummary[]),
        ])
        setTournament(t)
        setStandings((s ?? []).sort((a, b) => a.rank_position - b.rank_position))
        setMatches(m ?? [])
        setLobbies(l ?? [])
        setTeams(tm ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan turnamen')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return { tournament, standings, matches, lobbies, teams, loading, error }
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const days = Math.round(diff / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? days : 1
}
