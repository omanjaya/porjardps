import { create } from 'zustand'
import type { User } from '@/types'
import {
  api,
  setAccessToken,
  setUserRoleCookie,
  getAccessToken,
  refreshSession,
  getStoredRefreshToken,
  setStoredRefreshToken,
  migrateOldCookieToken,
} from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpired: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setUser: (user: User | null) => void
}

interface RegisterData {
  email: string
  password: string
  full_name: string
  phone?: string
  consent_given: boolean
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessionExpired: false,

  login: async (email, password) => {
    const data = await api.post<LoginResponse>('/auth/login', { email, password })
    setAccessToken(data.access_token)
    setStoredRefreshToken(data.refresh_token)
    setUserRoleCookie(data.user.role)
    set({ user: data.user, isAuthenticated: true, isLoading: false, sessionExpired: false })
  },

  register: async (data) => {
    await api.post('/auth/register', data)
  },

  logout: async () => {
    try {
      // Refresh token is now in HttpOnly cookie — sent automatically via credentials:include.
      // The API will read it from the cookie; no need to send in body.
      await api.post('/auth/logout', {})
    } finally {
      setAccessToken(null) // also clears access_token & user_role cookies
      setStoredRefreshToken(null) // clean up any legacy localStorage entry
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  fetchMe: async () => {
    // Clear any legacy access_token that was stored in document.cookie
    migrateOldCookieToken()

    // Ensure the CSRF cookie is set before any mutations happen
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/csrf-token`, {
        credentials: 'include',
        method: 'GET',
      })
    } catch {
      // Non-critical — continue even if the CSRF endpoint is unreachable
    }

    try {
      // No access token in memory? Try refresh first.
      // The refresh token is in an HttpOnly cookie — we can't check it from JS,
      // so we always attempt a refresh and let the API tell us if it's valid.
      if (!getAccessToken()) {
        const ok = await refreshSession()
        if (!ok) {
          // No valid session — could be expired or never logged in
          set({ user: null, isAuthenticated: false, isLoading: false, sessionExpired: false })
          return
        }
      }

      // Now we have a valid access token
      const user = await api.get<User>('/auth/me')
      setUserRoleCookie(user.role)
      set({ user, isAuthenticated: true, isLoading: false, sessionExpired: false })
    } catch {
      setAccessToken(null) // also clears cookies
      setStoredRefreshToken(null) // clean up legacy localStorage
      set({ user: null, isAuthenticated: false, isLoading: false, sessionExpired: false })
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false })
  },
}))

// Re-export for debug page
export const getRefreshToken = getStoredRefreshToken
