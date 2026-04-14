'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Team, TeamDetail } from '@/types'

export interface PlayerResult {
  id: string
  full_name: string
  email: string
}

export function usePlayerAssignment() {
  const [detailTeam, setDetailTeam] = useState<TeamDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [playerSearch, setPlayerSearch] = useState('')
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([])
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false)
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null)
  const [assignForm, setAssignForm] = useState({ in_game_name: '', in_game_id: '', role: 'member' })
  const [assignLoading, setAssignLoading] = useState(false)

  async function openDetail(team: Team) {
    setDetailOpen(true)
    setDetailLoading(true)
    setPlayerSearch('')
    setPlayerResults([])
    setShowUnassigned(false)
    setSelectedPlayer(null)
    setAssignForm({ in_game_name: '', in_game_id: '', role: 'member' })
    try {
      const data = await api.get<TeamDetail>(`/teams/${team.id}`)
      setDetailTeam(data)
    } catch {
      toast.error('Gagal memuat detail tim')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  async function searchPlayers(query: string, unassigned: boolean) {
    if (!detailTeam) return
    setPlayerSearchLoading(true)
    try {
      const gameId = detailTeam.game?.id
      let url = `/admin/players?per_page=30`
      if (query.trim().length >= 2) url += `&search=${encodeURIComponent(query.trim())}`
      if (unassigned && gameId) url += `&not_in_game_id=${gameId}`
      const res = await api.getPaginated<PlayerResult[]>(url)
      setPlayerResults(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Gagal mencari pemain')
    } finally {
      setPlayerSearchLoading(false)
    }
  }

  async function handleAssignPlayer() {
    if (!detailTeam || !selectedPlayer) return
    if (!assignForm.in_game_name.trim()) {
      toast.error('In-game name wajib diisi')
      return
    }
    setAssignLoading(true)
    try {
      await api.post(`/admin/teams/${detailTeam.id}/members`, {
        user_id: selectedPlayer.id,
        in_game_name: assignForm.in_game_name.trim(),
        in_game_id: assignForm.in_game_id.trim() || undefined,
        role: assignForm.role,
      })
      toast.success(`${selectedPlayer.full_name} berhasil ditambahkan ke tim`)
      setSelectedPlayer(null)
      setAssignForm({ in_game_name: '', in_game_id: '', role: 'member' })
      setPlayerSearch('')
      setPlayerResults([])
      const data = await api.get<TeamDetail>(`/teams/${detailTeam.id}`)
      setDetailTeam(data)
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Gagal menambahkan anggota'
      toast.error(msg)
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!detailTeam) return
    try {
      await api.delete(`/teams/${detailTeam.id}/members/${memberId}`)
      toast.success('Anggota dihapus')
      const data = await api.get<TeamDetail>(`/teams/${detailTeam.id}`)
      setDetailTeam(data)
    } catch {
      toast.error('Gagal menghapus anggota')
    }
  }

  return {
    detailTeam,
    detailOpen,
    setDetailOpen,
    detailLoading,
    playerSearch,
    setPlayerSearch,
    playerResults,
    playerSearchLoading,
    showUnassigned,
    setShowUnassigned,
    selectedPlayer,
    setSelectedPlayer,
    assignForm,
    setAssignForm,
    assignLoading,
    openDetail,
    searchPlayers,
    handleAssignPlayer,
    handleRemoveMember,
  }
}
