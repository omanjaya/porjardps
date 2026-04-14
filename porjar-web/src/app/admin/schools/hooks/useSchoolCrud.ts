'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { School, SchoolLevel, SchoolRequest, Team } from '@/types'

export interface SchoolFormData {
  name: string
  level: SchoolLevel
  address: string
  city: string
  logo_url: string
}

export const emptyForm: SchoolFormData = {
  name: '',
  level: 'SMA',
  address: '',
  city: 'Denpasar',
  logo_url: '',
}

export function useSchoolCrud() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [schools, setSchools] = useState<School[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [schoolRequests, setSchoolRequests] = useState<SchoolRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      let allSchools: School[] = []
      let page = 1
      let totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<School[]>(`/admin/schools?per_page=100&page=${page}`)
        const pageData = Array.isArray(res.data) ? res.data : []
        allSchools = [...allSchools, ...pageData]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }
      setSchools(allSchools)

      let allTeams: Team[] = []
      page = 1
      totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<Team[]>(`/teams?per_page=100&page=${page}`)
        const pageData = Array.isArray(res.data) ? res.data : []
        allTeams = [...allTeams, ...pageData]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }
      setTeams(allTeams)

      try {
        const reqRes = await api.getPaginated<SchoolRequest[]>('/admin/school-requests?status=pending&per_page=50')
        setSchoolRequests(Array.isArray(reqRes.data) ? reqRes.data : [])
      } catch {
        // silently ignore — feature may not be migrated yet
      }
    } catch {
      toast.error('Gagal memuat data sekolah')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function saveSchool(form: SchoolFormData, editingId: string | null): Promise<boolean> {
    if (!form.name.trim()) {
      toast.error('Nama sekolah wajib diisi')
      return false
    }

    if (!editingId) {
      const duplicate = schools.find(
        (s) =>
          s.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
          s.level === form.level
      )
      if (duplicate) {
        toast.warning('Sekolah dengan nama dan jenjang ini sudah ada')
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        level: form.level,
        address: form.address,
        city: form.city,
        logo_url: form.logo_url || null,
      }
      if (editingId) {
        await api.put(`/admin/schools/${editingId}`, payload)
        toast.success('Sekolah berhasil diperbarui')
      } else {
        await api.post('/admin/schools', payload)
        toast.success('Sekolah berhasil ditambahkan')
      }
      await loadData()
      return true
    } catch {
      toast.error('Gagal menyimpan sekolah')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSchool(id: string) {
    try {
      await api.delete(`/admin/schools/${id}`)
      toast.success('Sekolah berhasil dihapus')
      await loadData()
    } catch {
      toast.error('Gagal menghapus sekolah')
    }
  }

  async function assignTeam(teamId: string, schoolId: string, onDone?: () => void) {
    setAssigningTeamId(teamId)
    try {
      await api.put(`/admin/teams/${teamId}`, { school_id: schoolId })
      toast.success('Tim berhasil dipindahkan ke sekolah ini')
      onDone?.()
      await loadData()
    } catch {
      toast.error('Gagal memindahkan tim')
    } finally {
      setAssigningTeamId(null)
    }
  }

  return {
    schools,
    teams,
    schoolRequests,
    setSchoolRequests,
    loading,
    submitting,
    assigningTeamId,
    loadData,
    saveSchool,
    deleteSchool,
    assignTeam,
  }
}
