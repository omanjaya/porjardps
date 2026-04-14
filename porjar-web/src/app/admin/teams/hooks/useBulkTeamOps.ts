'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Team } from '@/types'

export function useBulkTeamOps(reload: () => Promise<void>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  function pendingOnPage(teams: Team[]) {
    return teams.filter((t) => t.status === 'pending')
  }

  function isAllPendingSelected(teams: Team[]) {
    const p = pendingOnPage(teams)
    return p.length > 0 && p.every((t) => selectedIds.has(t.id))
  }

  function toggleSelectAll(teams: Team[]) {
    const p = pendingOnPage(teams)
    const all = isAllPendingSelected(teams)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (all) p.forEach((t) => next.delete(t.id))
      else p.forEach((t) => next.add(t.id))
      return next
    })
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkAction(action: 'approve' | 'reject') {
    if (selectedIds.size === 0) return
    setBulkProcessing(true)
    const ids = Array.from(selectedIds)
    try {
      if (action === 'approve') {
        await Promise.all(ids.map((id) => api.put(`/admin/teams/${id}/approve`)))
        toast.success(`${ids.length} tim disetujui`)
      } else {
        await Promise.all(
          ids.map((id) =>
            api.put(`/admin/teams/${id}/reject`, { reason: 'Ditolak massal oleh admin' })
          )
        )
        toast.success(`${ids.length} tim ditolak`)
      }
      setSelectedIds(new Set())
      await reload()
    } catch {
      toast.error('Gagal memproses beberapa tim')
    } finally {
      setBulkProcessing(false)
    }
  }

  return {
    selectedIds,
    setSelectedIds,
    bulkProcessing,
    pendingOnPage,
    isAllPendingSelected,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
    handleBulkAction,
  }
}
