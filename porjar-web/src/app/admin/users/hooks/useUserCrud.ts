'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import type { User, UserRole } from '@/types'
import { roleLabels, type CreateUserForm, type EditUserForm, type CredentialData } from '../constants'

export function useUserCrud(refetch: () => Promise<void> | void) {
  const [processing, setProcessing] = useState(false)

  async function createUser(form: CreateUserForm): Promise<boolean> {
    if (!form.full_name || !form.email || !form.password) {
      toast.error('Nama, email, dan password wajib diisi')
      return false
    }
    setProcessing(true)
    try {
      const payload: Record<string, string> = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      }
      if (form.phone) payload.phone = form.phone
      if (form.tingkat) payload.tingkat = form.tingkat
      await api.post('/admin/users', payload)
      toast.success(`Pengguna ${form.full_name} berhasil ditambahkan`)
      await refetch()
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menambahkan pengguna'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }

  async function editUser(user: User, form: EditUserForm): Promise<boolean> {
    if (!form.full_name || !form.email) {
      toast.error('Nama dan email wajib diisi')
      return false
    }
    setProcessing(true)
    try {
      const payload: Record<string, string> = {
        full_name: form.full_name,
        email: form.email,
      }
      if (form.phone) payload.phone = form.phone
      if (form.tingkat) payload.tingkat = form.tingkat
      if (form.nisn) payload.nisn = form.nisn
      await api.put(`/admin/users/${user.id}`, payload)
      toast.success(`Data ${form.full_name} berhasil diperbarui`)
      await refetch()
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui data pengguna'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }

  async function deleteUser(user: User): Promise<boolean> {
    setProcessing(true)
    try {
      await api.delete(`/admin/users/${user.id}`)
      toast.success(`Pengguna ${user.full_name} berhasil dihapus`)
      await refetch()
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus pengguna'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }

  async function changeRole(user: User, newRole: UserRole): Promise<boolean> {
    setProcessing(true)
    try {
      await api.put(`/admin/users/${user.id}/role`, { role: newRole })
      toast.success(`Role ${user.full_name} diubah ke ${roleLabels[newRole]}`)
      await refetch()
      return true
    } catch {
      toast.error('Gagal mengubah role')
      return false
    } finally {
      setProcessing(false)
    }
  }

  async function resetPassword(user: User): Promise<{ password: string; credential: CredentialData | null } | null> {
    setProcessing(true)
    try {
      const result = await api.post<{ password: string }>(`/admin/users/${user.id}/reset-password`)
      toast.success(`Password ${user.full_name} berhasil direset`)
      let credential: CredentialData | null = null
      try {
        credential = await api.get<CredentialData>(`/admin/users/${user.id}/credential`)
      } catch {
        // ignore
      }
      return { password: result.password, credential }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mereset password'
      toast.error(msg)
      return null
    } finally {
      setProcessing(false)
    }
  }

  async function fetchCredential(user: User): Promise<CredentialData | null> {
    try {
      return await api.get<CredentialData>(`/admin/users/${user.id}/credential`)
    } catch {
      toast.error('Gagal memuat data kartu')
      return null
    }
  }

  return {
    processing,
    createUser,
    editUser,
    deleteUser,
    changeRole,
    resetPassword,
    fetchCredential,
  }
}
