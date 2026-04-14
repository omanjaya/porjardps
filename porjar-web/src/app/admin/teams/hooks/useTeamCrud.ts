'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Team } from '@/types'

export interface ConfirmAction {
  teamId: string
  teamName: string
  action: 'approve' | 'reject' | 'delete'
}

export function useTeamCrud(reload: () => Promise<void>) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [processing, setProcessing] = useState(false)

  // Create
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', game_id: '', school_id: '' })
  const [createLoading, setCreateLoading] = useState(false)

  // Edit
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [editName, setEditName] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  async function handleAction() {
    if (!confirmAction) return
    setProcessing(true)
    try {
      if (confirmAction.action === 'approve') {
        await api.put(`/admin/teams/${confirmAction.teamId}/approve`)
        toast.success(`${confirmAction.teamName} disetujui`)
      } else if (confirmAction.action === 'reject') {
        await api.put(`/admin/teams/${confirmAction.teamId}/reject`, { reason: 'Ditolak oleh admin' })
        toast.success(`${confirmAction.teamName} ditolak`)
      } else if (confirmAction.action === 'delete') {
        await api.delete(`/admin/teams/${confirmAction.teamId}`)
        toast.success(`${confirmAction.teamName} dihapus`)
      }
      setConfirmAction(null)
      await reload()
    } catch {
      toast.error('Gagal melakukan aksi')
    } finally {
      setProcessing(false)
    }
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.game_id || !createForm.school_id) {
      toast.error('Semua field wajib diisi')
      return
    }
    setCreateLoading(true)
    try {
      await api.post('/teams', createForm)
      toast.success('Tim berhasil dibuat')
      setCreateOpen(false)
      setCreateForm({ name: '', game_id: '', school_id: '' })
      await reload()
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Gagal membuat tim'
      toast.error(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEdit() {
    if (!editTeam || !editName.trim()) return
    setEditLoading(true)
    try {
      await api.put(`/admin/teams/${editTeam.id}`, { name: editName.trim() })
      toast.success('Nama tim diperbarui')
      setEditTeam(null)
      await reload()
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Gagal mengubah tim'
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  return {
    confirmAction,
    setConfirmAction,
    processing,
    handleAction,
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    createLoading,
    handleCreate,
    editTeam,
    setEditTeam,
    editName,
    setEditName,
    editLoading,
    handleEdit,
  }
}
