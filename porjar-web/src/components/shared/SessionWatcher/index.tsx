'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { setAccessToken, setStoredRefreshToken } from '@/lib/api'

export function SessionWatcher() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    function handleExpired() {
      setAccessToken(null)
      setStoredRefreshToken(null)
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, sessionExpired: true })
      router.push('/login?expired=1')
    }

    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [router])

  // Only mount the listener when user is authenticated (avoids noise on public pages)
  return null
}
