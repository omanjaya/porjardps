'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { Tournament, TournamentGroup, GroupMatch, GroupStanding, TeamSummary } from '@/types'

export function useGroupManagement(tournamentId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [groups, setGroups] = useState<TournamentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [availableTeams, setAvailableTeams] = useState<TeamSummary[]>([])
  const [groupMatches, setGroupMatches] = useState<Record<string, GroupMatch[]>>({})
  const [groupStandings, setGroupStandings] = useState<Record<string, GroupStanding[]>>({})
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [operating, setOperating] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [t, g, teams] = await Promise.all([
        api.get<Tournament>(`/tournaments/${tournamentId}`),
        api.get<TournamentGroup[]>(`/tournaments/${tournamentId}/groups`),
        api.get<TeamSummary[]>(`/tournaments/${tournamentId}/teams`).catch(() => [] as TeamSummary[]),
      ])
      setTournament(t)
      setGroups(g ?? [])
      setAvailableTeams(teams ?? [])

      const matchesMap: Record<string, GroupMatch[]> = {}
      const standingsMap: Record<string, GroupStanding[]> = {}
      for (const group of g ?? []) {
        const [matches, standings] = await Promise.all([
          api.get<GroupMatch[]>(`/groups/${group.id}/matches`).catch(() => [] as GroupMatch[]),
          api.get<GroupStanding[]>(`/groups/${group.id}/standings`).catch(() => [] as GroupStanding[]),
        ])
        matchesMap[group.id] = matches ?? []
        standingsMap[group.id] = standings ?? []
      }
      setGroupMatches(matchesMap)
      setGroupStandings(standingsMap)
      setExpandedGroups(new Set((g ?? []).map(gr => gr.id)))
    } catch {
      toast.error('Gagal memuat data grup')
    } finally {
      setLoading(false)
    }
  }, [tournamentId, isAuthenticated, authLoading])

  useEffect(() => { loadData() }, [loadData])

  const toggleGroup = (id: string) => setExpandedGroups(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const createGroup = async (payload: { name: string; group_order: number; advance_count: number; legs: number }): Promise<boolean> => {
    try {
      await api.post('/admin/groups', { tournament_id: tournamentId, ...payload })
      toast.success('Grup berhasil dibuat')
      loadData()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat grup')
      return false
    }
  }

  const editGroup = async (groupId: string, payload: { name: string; advance_count: number }): Promise<boolean> => {
    try {
      await api.put(`/admin/groups/${groupId}`, payload)
      toast.success('Grup berhasil diperbarui')
      loadData()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui grup')
      return false
    }
  }

  const deleteGroupAction = async (groupId: string) => {
    setOperating(true)
    try { await api.delete(`/admin/groups/${groupId}`); toast.success('Grup dihapus'); loadData() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal menghapus grup') }
    finally { setOperating(false) }
  }

  const addTeamsToGroup = async (groupId: string, teamIds: string[]): Promise<boolean> => {
    try {
      await api.post(`/admin/groups/${groupId}/teams`, { team_ids: teamIds })
      toast.success('Tim ditambahkan')
      loadData()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan tim')
      return false
    }
  }

  const removeTeam = async (groupId: string, teamId: string) => {
    try { await api.delete(`/admin/groups/${groupId}/teams/${teamId}`); toast.success('Tim dihapus dari grup'); loadData() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal menghapus tim') }
  }

  const generateMatches = async (groupId: string) => {
    setOperating(true)
    try { await api.post(`/admin/groups/${groupId}/generate`); toast.success('Pertandingan di-generate'); loadData() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal generate') }
    finally { setOperating(false) }
  }

  const updateScore = async (matchId: string, groupId: string, sa: number, sb: number, scheduledAt?: string) => {
    setOperating(true)
    try {
      await api.put(`/admin/groups/${groupId}/matches/${matchId}`, {
        score_a: sa,
        score_b: sb,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      })
      toast.success('Skor disimpan')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan skor')
    } finally { setOperating(false) }
  }

  const setPenalty = async (groupId: string, teamId: string, penaltyPoints: number) => {
    try {
      await api.put(`/admin/groups/${groupId}/standings/${teamId}/penalty`, { penalty_points: penaltyPoints })
      toast.success('Penalti diperbarui')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui penalti')
    }
  }

  const setMatchLive = async (matchId: string, groupId: string) => {
    setOperating(true)
    try {
      await api.put(`/admin/groups/${groupId}/matches/${matchId}/live`)
      toast.success('Status match diubah ke LIVE')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status match')
    } finally { setOperating(false) }
  }

  const setAllLive = async (groupId: string, round?: number) => {
    setOperating(true)
    const allMatches = groupMatches[groupId] ?? []
    const matches = allMatches.filter(m =>
      m.status !== 'live' && m.status !== 'completed' && (round == null || m.round === round)
    )
    if (matches.length === 0) {
      toast.info('Tidak ada match yang perlu di-set LIVE')
      setOperating(false)
      return
    }
    let success = 0
    for (const m of matches) {
      try {
        await api.put(`/admin/groups/${groupId}/matches/${m.id}/live`)
        success++
      } catch { /* skip */ }
    }
    toast.success(`${success} match berhasil di-set LIVE`)
    await loadData()
    setOperating(false)
  }

  const resetGroupResults = async (groupId: string) => {
    setOperating(true)
    try {
      await api.post(`/admin/groups/${groupId}/reset-results`)
      toast.success('Hasil grup berhasil direset')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mereset hasil grup')
    } finally { setOperating(false) }
  }

  const resetMatchSubmissions = async (matchId: string) => {
    setOperating(true)
    try {
      await api.delete(`/admin/submissions/match/${matchId}?type=group`)
      toast.success('Submissions match berhasil direset')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mereset submissions')
    } finally { setOperating(false) }
  }

  const advancePlayoff = async () => {
    setAdvancing(true)
    try {
      await api.post(`/admin/tournaments/${tournamentId}/advance-playoff`)
      toast.success('Bracket playoff berhasil!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal generate playoff')
    } finally {
      setAdvancing(false)
    }
  }

  return {
    tournament, groups, loading, availableTeams, groupMatches, groupStandings,
    expandedGroups, operating, advancing,
    loadData, toggleGroup,
    createGroup, editGroup, deleteGroupAction, addTeamsToGroup, removeTeam,
    generateMatches, updateScore, setPenalty, setMatchLive, setAllLive,
    resetGroupResults, resetMatchSubmissions, advancePlayoff,
  }
}
