'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'
import { useAuthStore } from '@/store/auth-store'

export interface ActiveMatch {
  id: string
  type: 'bracket' | 'battle_royale' | 'group'
  team_a_name: string
  team_b_name: string
  game_name: string
  game_slug: string
  best_of?: number
  lobby_name?: string
  scheduled_at: string | null
  num_maps?: number
  current_map?: number
  map_names?: string[]
}

export function useActiveMatches() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([])
  const [submissions, setSubmissions] = useState<SubmissionData[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [matches, subs] = await Promise.all([
        api.get<ActiveMatch[]>('/submissions/active-matches'),
        api.get<SubmissionData[]>('/submissions/my'),
      ])
      const allSubs = subs ?? []
      // Only hide match if there's a pending submission awaiting review.
      // For BO series, approved submissions don't block — player can submit next game.
      const pendingMatchIDs = new Set(
        allSubs
          .filter(s => s.status === 'pending')
          .map(s => s.match_id)
      )
      const filteredMatches = (matches ?? []).filter(m => !pendingMatchIDs.has(m.id))
      setActiveMatches(filteredMatches)
      setSubmissions(allSubs)
    } catch {
      toast.error('Gagal memuat data pertandingan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    loadData()
  }, [isAuthenticated, authLoading, loadData])

  return { activeMatches, submissions, loading, loadData }
}
