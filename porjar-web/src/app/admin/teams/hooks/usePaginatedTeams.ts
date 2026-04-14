'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Team, Game, GameSlug, TeamStatus } from '@/types'

export interface School {
  id: string
  name: string
  level: string
}

export const PER_PAGE = 20

export function usePaginatedTeams() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<{ id: string; slug: GameSlug; name: string }[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [totalTeams, setTotalTeams] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activeGame, setActiveGame] = useState<GameSlug | null>(null)
  const [statusFilter, setStatusFilter] = useState<TeamStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        per_page: String(PER_PAGE),
        page: String(currentPage),
      })
      if (activeGame) params.set('game_slug', activeGame)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const [res, g, s] = await Promise.all([
        api.getPaginated<Team[]>(`/teams?${params}`),
        games.length ? Promise.resolve(null) : api.get<(Game & { id: string })[]>('/games'),
        schools.length ? Promise.resolve(null) : api.getPaginated<School[]>('/schools?per_page=200'),
      ])
      setTeams(Array.isArray(res.data) ? res.data : [])
      setTotalTeams(res.meta?.total ?? 0)
      setTotalPages(res.meta?.total_pages ?? 1)
      if (g)
        setGames(
          (g ?? [])
            .filter((game) => game.is_active)
            .map((game) => ({ id: game.id, slug: game.slug, name: game.name }))
        )
      if (s) setSchools(Array.isArray(s.data) ? s.data : [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, currentPage, activeGame, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useWebSocket({
    channels: ['live-scores'],
    messageTypes: ['team_update'],
    onMessage: () => {
      loadData()
    },
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [activeGame, statusFilter])

  return {
    teams,
    games,
    schools,
    totalTeams,
    totalPages,
    loading,
    activeGame,
    setActiveGame,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    perPage: PER_PAGE,
    loadData,
  }
}
