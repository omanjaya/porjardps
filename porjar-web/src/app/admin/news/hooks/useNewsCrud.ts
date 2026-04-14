'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import type { News, NewsFormData } from '@/types'

function buildPayload(form: NewsFormData): Record<string, string> {
  const payload: Record<string, string> = {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    category: form.category,
  }
  if (form.image_url) payload.image_url = form.image_url
  if (form.published_at) {
    // Convert datetime-local (YYYY-MM-DDTHH:mm) to ISO string
    const d = new Date(form.published_at)
    if (!isNaN(d.getTime())) payload.published_at = d.toISOString()
  }
  return payload
}

export function useNewsCrud(refetch: () => Promise<void> | void) {
  const [processing, setProcessing] = useState(false)

  async function createNews(form: NewsFormData): Promise<boolean> {
    if (!form.title || !form.slug || !form.content || !form.category) {
      toast.error('Judul, slug, konten, dan kategori wajib diisi')
      return false
    }
    setProcessing(true)
    try {
      await api.post('/news', buildPayload(form))
      toast.success(`Berita "${form.title}" berhasil dibuat`)
      await refetch()
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal membuat berita'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }

  async function updateNews(news: News, form: NewsFormData): Promise<boolean> {
    if (!form.title || !form.slug || !form.content || !form.category) {
      toast.error('Judul, slug, konten, dan kategori wajib diisi')
      return false
    }
    setProcessing(true)
    try {
      await api.put(`/news/${news.id}`, buildPayload(form))
      toast.success(`Berita "${form.title}" berhasil diperbarui`)
      await refetch()
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui berita'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }

  async function deleteNews(news: News): Promise<boolean> {
    setProcessing(true)
    try {
      await api.delete(`/news/${news.id}`)
      toast.success(`Berita "${news.title}" berhasil dihapus`)
      await refetch()
      return true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus berita'
      toast.error(msg)
      return false
    } finally {
      setProcessing(false)
    }
  }

  return {
    processing,
    createNews,
    updateNews,
    deleteNews,
  }
}
