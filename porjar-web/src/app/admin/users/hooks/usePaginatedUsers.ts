'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { User } from '@/types'
import type { FilterRole } from '../constants'

export const PER_PAGE = 20

export function usePaginatedUsers() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<FilterRole>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        per_page: String(PER_PAGE),
        page: String(currentPage),
      })
      if (filterRole === 'captain') params.set('is_captain', 'true')
      else if (filterRole !== 'all') params.set('role', filterRole)
      if (debouncedSearch.length >= 2) params.set('search', debouncedSearch)

      const res = await api.getPaginated<User[]>(`/admin/users?${params}`)
      setUsers(Array.isArray(res.data) ? res.data : [])
      setTotalUsers(res.meta?.total ?? 0)
      setTotalPages(res.meta?.total_pages ?? 1)
    } catch {
      toast.error('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading, currentPage, filterRole, debouncedSearch])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    users,
    totalUsers,
    totalPages,
    loading,
    filterRole,
    setFilterRole,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    perPage: PER_PAGE,
    refetch: loadData,
  }
}
