'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { BracketMatch, TeamMember, Standing } from '@/types'

export interface DashboardData {
  team: {
    id: string
    name: string
    game_name: string
    game_slug: string
    school_name: string
    tournament_id?: string
    members: TeamMember[]
    status?: string
    rejection_reason?: string | null
    created_at?: string
  } | null
  next_match: BracketMatch | null
}

interface MyMatchData {
  team: unknown
  current_match: BracketMatch | null
  upcoming_matches: BracketMatch[]
  past_matches: BracketMatch[]
  bracket_path: string[]
  submissions: unknown[]
}

export interface EventSettings {
  event_name?: string
  organizer?: string
  contact_phone?: string
  contact_email?: string
  venue?: string
  event_date_start?: string
  event_date_end?: string
}

export function useDashboardData() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [standings, setStandings] = useState<Standing[] | null>(null)
  const [pastMatches, setPastMatches] = useState<BracketMatch[]>([])
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)

  const loadData = useCallback(async () => {
    try {
      const result = await api.get<DashboardData>('/player/dashboard')
      setData(result)

      const promises: Promise<void>[] = []

      promises.push(
        api
          .get<EventSettings>('/event-settings')
          .then((s) => setEventSettings(s))
          .catch(() => setEventSettings(null))
      )

      if (result.team?.tournament_id) {
        promises.push(
          api
            .get<Standing[]>(`/tournaments/${result.team.tournament_id}/standings`)
            .then((s) => setStandings(s))
            .catch(() => setStandings(null))
        )
      }

      if (result.team) {
        promises.push(
          api
            .get<MyMatchData>('/player/my-matches')
            .then((m) => setPastMatches(m.past_matches ?? []))
            .catch(() => setPastMatches([]))
        )
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('Gagal memuat dashboard:', err)
      setData({ team: null, next_match: null })
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading, loadData])

  useWebSocket({
    channels: ['live-scores'],
    messageTypes: ['match_status', 'match_complete', 'bracket_update', 'bracket_advance'],
    onMessage: () => {
      loadData()
    },
  })

  const myStanding = standings?.find((s) => s.team?.id === data?.team?.id) ?? null
  const totalTeams = standings?.length ?? 0

  return { data, standings, pastMatches, eventSettings, myStanding, totalTeams, reload: loadData }
}
