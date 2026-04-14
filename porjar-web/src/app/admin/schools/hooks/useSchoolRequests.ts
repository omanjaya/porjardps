'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export function useSchoolRequests(reload: () => Promise<void>) {
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  async function approveRequest(requestId: string) {
    setApprovingId(requestId)
    try {
      await api.post(`/admin/school-requests/${requestId}/approve`, { city: 'Denpasar' })
      toast.success('Sekolah berhasil disetujui dan ditambahkan')
      await reload()
    } catch {
      toast.error('Gagal menyetujui permintaan')
    } finally {
      setApprovingId(null)
    }
  }

  function openReject(requestId: string) {
    setRejectingId(requestId)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  async function rejectRequest() {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    try {
      await api.post(`/admin/school-requests/${rejectingId}/reject`, { reason: rejectReason.trim() })
      toast.success('Permintaan ditolak')
      setRejectDialogOpen(false)
      setRejectingId(null)
      setRejectReason('')
      await reload()
    } catch {
      toast.error('Gagal menolak permintaan')
    }
  }

  return {
    approvingId,
    rejectingId,
    rejectReason,
    setRejectReason,
    rejectDialogOpen,
    setRejectDialogOpen,
    approveRequest,
    openReject,
    rejectRequest,
  }
}
