'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { Team } from '@/types'

export function usePendingTeams() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      // Use the authenticated /admin/teams endpoint (not the public /teams
      // one) so a scoped event-admin only sees pending teams from their own
      // assigned events, per TeamHandler.List's event scoping.
      const res = await api.getPaginated<Team[]>('/admin/teams?status=pending&per_page=100')
      setTeams(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Gagal memuat tim pending')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    load()
  }, [load])

  async function approve(teamId: string, teamName: string) {
    setProcessingId(teamId)
    try {
      await api.put(`/admin/teams/${teamId}/approve`)
      toast.success(`${teamName} disetujui`)
      await load()
    } catch {
      toast.error('Gagal menyetujui tim')
    } finally {
      setProcessingId(null)
    }
  }

  async function reject(teamId: string, teamName: string, reason: string) {
    if (!reason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return false
    }
    setProcessingId(teamId)
    try {
      await api.put(`/admin/teams/${teamId}/reject`, { reason: reason.trim() })
      toast.success(`${teamName} ditolak`)
      await load()
      return true
    } catch {
      toast.error('Gagal menolak tim')
      return false
    } finally {
      setProcessingId(null)
    }
  }

  return { teams, loading, processingId, reload: load, approve, reject }
}
