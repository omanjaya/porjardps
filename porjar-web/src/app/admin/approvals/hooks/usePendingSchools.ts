'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { SchoolRequest } from '@/types'

export function usePendingSchools() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [requests, setRequests] = useState<SchoolRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const res = await api.getPaginated<SchoolRequest[]>(
        '/admin/school-requests?status=pending&per_page=100'
      )
      setRequests(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Gagal memuat permintaan sekolah')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    load()
  }, [load])

  async function approve(requestId: string) {
    setProcessingId(requestId)
    try {
      await api.post(`/admin/school-requests/${requestId}/approve`, { city: 'Denpasar' })
      toast.success('Sekolah disetujui')
      await load()
    } catch {
      toast.error('Gagal menyetujui permintaan')
    } finally {
      setProcessingId(null)
    }
  }

  async function reject(requestId: string, reason: string) {
    if (!reason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return false
    }
    setProcessingId(requestId)
    try {
      await api.post(`/admin/school-requests/${requestId}/reject`, { reason: reason.trim() })
      toast.success('Permintaan ditolak')
      await load()
      return true
    } catch {
      toast.error('Gagal menolak permintaan')
      return false
    } finally {
      setProcessingId(null)
    }
  }

  return { requests, loading, processingId, reload: load, approve, reject }
}
