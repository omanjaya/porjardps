'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { News } from '@/types'

export const PER_PAGE = 20

export function usePaginatedNews() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [news, setNews] = useState<News[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        per_page: String(PER_PAGE),
        page: String(currentPage),
      })
      const res = await api.getPaginated<News[]>(`/news?${params}`)
      setNews(Array.isArray(res.data) ? res.data : [])
      setTotalItems(res.meta?.total ?? 0)
      setTotalPages(res.meta?.total_pages ?? 1)
    } catch {
      toast.error('Gagal memuat berita')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading, currentPage])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    news,
    totalItems,
    totalPages,
    loading,
    currentPage,
    setCurrentPage,
    perPage: PER_PAGE,
    refetch: loadData,
  }
}
