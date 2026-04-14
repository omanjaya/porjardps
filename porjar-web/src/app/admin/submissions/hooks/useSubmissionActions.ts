'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { AdminSubmissionData } from '../components/SubmissionStatusBadge'

export function useSubmissionActions(
  setSubmissions: Dispatch<SetStateAction<AdminSubmissionData[]>>,
  reload: () => void,
) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRejectReason('')
  }, [rejectId])

  async function handleApprove(id: string) {
    if (!window.confirm('Yakin approve submission ini?')) return
    setProcessing(id)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: true })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' as const } : s))
      toast.success('Submission disetujui!')
    } catch {
      toast.error('Gagal menyetujui submission')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      toast.error('Masukkan alasan penolakan')
      return
    }
    setProcessing(id)
    try {
      await api.put(`/admin/submissions/${id}/verify`, { approved: false, rejection_reason: rejectReason })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' as const, rejection_reason: rejectReason } : s))
      toast.success('Submission ditolak')
      setRejectId(null)
      setRejectReason('')
    } catch {
      toast.error('Gagal menolak submission')
    } finally {
      setProcessing(null)
    }
  }

  async function handleBulkApprove() {
    if (!window.confirm(`Approve ${selectedIds.size} submission?`)) return
    setBulkProcessing(true)
    let success = 0
    let failed = 0
    for (const id of selectedIds) {
      try {
        await api.put(`/admin/submissions/${id}/verify`, { approved: true })
        success++
      } catch {
        failed++
      }
    }
    if (failed > 0) {
      toast.error(`${failed} submission gagal di-approve`)
    }
    if (success > 0) {
      toast.success(`${success} submission berhasil di-approve`)
    }
    setSelectedIds(new Set())
    setBulkProcessing(false)
    reload()
  }

  function handleSheetVerified(id: string, status: 'approved' | 'rejected', reason?: string, adminNotes?: string) {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status, rejection_reason: reason, admin_notes: adminNotes } : s))
  }

  return {
    processing,
    bulkProcessing,
    rejectId,
    setRejectId,
    rejectReason,
    setRejectReason,
    selectedIds,
    setSelectedIds,
    handleApprove,
    handleReject,
    handleBulkApprove,
    handleSheetVerified,
  }
}
