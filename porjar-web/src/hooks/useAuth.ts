'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import type { UserRole } from '@/types'

export function useAuth(requiredRole?: UserRole | UserRole[]) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, sessionExpired, fetchMe } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      fetchMe()
    }
  }, [isAuthenticated, isLoading, fetchMe])

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push(sessionExpired ? '/login?expired=1' : '/login')
      return
    }

    if (requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!roles.includes(user.role)) {
        router.push('/')
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router])

  return { user, isAuthenticated, isLoading }
}
