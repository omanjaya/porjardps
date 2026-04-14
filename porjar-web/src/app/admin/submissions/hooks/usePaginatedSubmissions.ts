'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { AdminSubmissionData, FilterTab } from '../components/SubmissionStatusBadge'

export function usePaginatedSubmissions(filter: FilterTab, gameFilter: string, search: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [submissions, setSubmissions] = useState<AdminSubmissionData[]>([])
  const [loading, setLoading] = useState(true)

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await api.get<AdminSubmissionData[]>('/admin/submissions')
      setSubmissions(data ?? [])
    } catch {
      toast.error('Gagal memuat submissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadSubmissions()
  }, [isAuthenticated, authLoading, loadSubmissions])

  useWebSocket({
    channels: ['live-scores'],
    messageTypes: ['new_submission'],
    onMessage: () => { loadSubmissions() },
  })

  const gameNames = useMemo(
    () => [...new Set(submissions.map(s => s.game_name).filter(Boolean))].sort(),
    [submissions],
  )

  const filtered = useMemo(() => submissions.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false
    if (gameFilter && s.game_name !== gameFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (s.team_a_name?.toLowerCase() ?? '').includes(q) ||
        (s.team_b_name?.toLowerCase() ?? '').includes(q) ||
        (s.submitted_by?.toLowerCase() ?? '').includes(q) ||
        (s.submitted_team?.toLowerCase() ?? '').includes(q) ||
        (s.game_name?.toLowerCase() ?? '').includes(q)
      )
    }
    return true
  }), [submissions, filter, gameFilter, search])

  const pendingCount = useMemo(
    () => submissions.filter(s => s.status === 'pending').length,
    [submissions],
  )

  return {
    submissions,
    setSubmissions,
    loading,
    filtered,
    gameNames,
    pendingCount,
    reload: loadSubmissions,
  }
}
