'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import type { SiteSettings } from '@/types/site-settings'

const EMPTY: SiteSettings = {
  id: 0,
  faqs: [],
  about_items: [],
  contacts: [],
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<SiteSettings>('/site-settings')
      setSettings({
        id: data.id ?? 0,
        faqs: data.faqs ?? [],
        about_items: data.about_items ?? [],
        contacts: data.contacts ?? [],
        updated_at: data.updated_at,
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat pengaturan situs'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const save = useCallback(async (updated: SiteSettings): Promise<boolean> => {
    setSaving(true)
    try {
      const payload = {
        faqs: updated.faqs,
        about_items: updated.about_items,
        contacts: updated.contacts,
      }
      const data = await api.put<SiteSettings>('/admin/site-settings', payload)
      setSettings({
        id: data.id ?? updated.id,
        faqs: data.faqs ?? updated.faqs,
        about_items: data.about_items ?? updated.about_items,
        contacts: data.contacts ?? updated.contacts,
        updated_at: data.updated_at,
      })
      toast.success('Pengaturan situs berhasil disimpan')
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan situs'
      toast.error(msg)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    settings,
    setSettings,
    loading,
    saving,
    save,
    refetch: fetchSettings,
  }
}
