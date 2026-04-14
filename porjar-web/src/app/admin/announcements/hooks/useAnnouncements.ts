'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Announcement {
  id: number
  event_id: string
  title: string
  message: string
  priority: AnnouncementPriority
  created_by?: string | null
  created_at: string
  expires_at?: string | null
}

export interface AnnouncementFormData {
  title: string
  message: string
  priority: AnnouncementPriority
  expires_at: string
}

export function useAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentEventSlug, setCurrentEventSlug] = useState<string | null>(null)

  const list = useCallback(async (eventSlug: string) => {
    setCurrentEventSlug(eventSlug)
    setLoading(true)
    try {
      const data = await api.get<Announcement[]>(`/events/${eventSlug}/announcements`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat pengumuman'
      toast.error(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (
    eventId: string,
    eventSlug: string,
    form: AnnouncementFormData,
  ): Promise<boolean> => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Judul dan pesan wajib diisi')
      return false
    }
    setProcessing(true)
    try {
      const payload: Record<string, string> = {
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
      }
      if (form.expires_at) {
        const d = new Date(form.expires_at)
        if (!isNaN(d.getTime())) payload.expires_at = d.toISOString()
      }
      await api.post(`/admin/events/${eventId}/announcements`, payload)
      toast.success('Pengumuman berhasil dikirim')
      await list(eventSlug)
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mengirim pengumuman'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }, [list])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    setProcessing(true)
    try {
      await api.delete(`/admin/announcements/${id}`)
      toast.success('Pengumuman dihapus')
      if (currentEventSlug) await list(currentEventSlug)
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus pengumuman'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }, [currentEventSlug, list])

  return { items, loading, processing, list, create, remove }
}
