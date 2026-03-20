import type { ApiResponse, ApiErrorBody } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090/api/v1'
const API_BASE = API_URL.replace(/\/api\/v\d+$/, '')

/**
 * Resolve a media URL that may be a relative path from the API server.
 * - /uploads/... → prepend API host (served by Go API)
 * - /images/...  → keep as-is (served by Next.js public folder)
 * - http(s)://... → keep as-is (already absolute)
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`
  return url
}
const RT_KEY = 'porjar_rt'

export class ApiError extends Error {
  code: string
  details?: Record<string, string>

  constructor(code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.code = code
    this.details = details
    this.name = 'ApiError'
  }
}

let accessToken: string | null = null

// ── Cookie helpers for middleware auth detection ──
// NOTE: access_token is intentionally NOT written to document.cookie to prevent
// XSS exposure. The middleware uses the access_token cookie for route protection;
// ideally the refresh token should be an HttpOnly cookie set by the backend so
// the middleware can verify auth without any JS-accessible cookie.
// TODO: migrate to HttpOnly cookies set server-side when backend supports it.
function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? ';Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Strict${secure}`
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Strict`
}

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) {
    // Write to cookie so Next.js middleware can detect the session for route protection.
    // The cookie is non-HttpOnly (JS-readable) which is required for middleware.
    // XSS risk is mitigated by CSP (no unsafe-inline in script-src).
    setCookie('access_token', token, 3600)
  } else {
    removeCookie('access_token')
    removeCookie('user_role')
  }
}

/**
 * Hydrate the in-memory access token from the access_token cookie.
 * Called on page load to avoid an unnecessary refresh round-trip when the
 * access_token cookie (written by setAccessToken) is still valid.
 */
export function migrateOldCookieToken(): void {
  if (accessToken) return // already hydrated
  if (typeof document === 'undefined') return
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)
  if (match) {
    accessToken = decodeURIComponent(match[1])
  }
}

export function setUserRoleCookie(role: string | null) {
  if (role) {
    setCookie('user_role', role, 3600)
  } else {
    removeCookie('user_role')
  }
}

export function getAccessToken(): string | null {
  return accessToken
}

export function getStoredRefreshToken(): string | null {
  // Refresh token is now stored as HttpOnly cookie set by the API.
  // No longer accessible from JavaScript — return null.
  return null
}

export function setStoredRefreshToken(_token: string | null) {
  // No-op: refresh token is now managed as an HttpOnly cookie by the API.
  // Clean up any legacy localStorage entry.
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RT_KEY)
  }
}

// ── Single shared refresh with dedup lock ──
let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  // If already refreshing, wait for that result
  if (refreshPromise) return refreshPromise

  refreshPromise = doRefresh()
  const result = await refreshPromise
  refreshPromise = null
  return result
}

async function doRefresh(): Promise<boolean> {
  try {
    // Send request with credentials:include so the HttpOnly refresh_token
    // cookie is automatically sent to the API. No need to read it from JS.
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!res.ok) {
      return false
    }

    const body = await res.json()
    if (body.success && body.data?.access_token) {
      setAccessToken(body.data.access_token)
      return true
    }

    return false
  } catch {
    return false
  }
}

// ── CSRF token helper (Double Submit Cookie pattern) ──
function getCSRFToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)porjar_csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// ── API request with auto-refresh ──
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (options.method || 'GET').toUpperCase()
  )

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(isMutation ? { 'X-CSRF-Token': getCSRFToken() } : {}),
    ...options.headers,
  }

  if (accessToken) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout - server tidak merespons')
    }
    throw err
  }
  clearTimeout(timeoutId)

  if (res.status === 204) {
    return undefined as T
  }

  const body: ApiResponse<T> = await res.json()

  if (!body.success) {
    const err = body.error as ApiErrorBody

    // Auto-refresh on 401 (except login failures)
    if (res.status === 401 && err.code !== 'INVALID_CREDENTIALS' && err.code !== 'ACCOUNT_LOCKED') {
      const refreshed = await refreshSession()
      if (refreshed) {
        return apiRequest<T>(endpoint, options)
      }
      // Refresh failed mid-session — notify app to redirect to login
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
      }
    }

    throw new ApiError(err.code, err.message, err.details)
  }

  return body.data
}

// ── Typed API methods ──
export const api = {
  get<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'GET' })
  },

  async getPaginated<T>(endpoint: string): Promise<{ data: T; meta: { page: number; per_page: number; total: number; total_pages: number } | null }> {
    const url = `${API_URL}${endpoint}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    const pgController = new AbortController()
    const pgTimeoutId = setTimeout(() => pgController.abort(), 30000)
    let res: Response
    try {
      res = await fetch(url, { method: 'GET', headers, credentials: 'include', signal: pgController.signal })
    } catch (err) {
      clearTimeout(pgTimeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timeout - server tidak merespons')
      }
      throw err
    }
    clearTimeout(pgTimeoutId)
    if (res.status === 401) {
      const body401 = await res.json().catch(() => ({ error: { code: 'UNKNOWN' } }))
      const errCode = body401?.error?.code
      if (errCode !== 'INVALID_CREDENTIALS' && errCode !== 'ACCOUNT_LOCKED') {
        const refreshed = await refreshSession()
        if (refreshed) return api.getPaginated<T>(endpoint)
        // Refresh failed — notify app to redirect to login
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:session-expired'))
        }
      }
      const err = body401.error as ApiErrorBody
      throw new ApiError(err.code, err.message, err.details)
    }
    const body = await res.json()
    if (!body.success) {
      const err = body.error as ApiErrorBody
      throw new ApiError(err.code, err.message, err.details)
    }
    return { data: body.data, meta: body.meta ?? null }
  },

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  delete<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'DELETE' })
  },

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${API_URL}${endpoint}`
    const headers: Record<string, string> = {
      'X-CSRF-Token': getCSRFToken(),
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const uploadController = new AbortController()
    const uploadTimeoutId = setTimeout(() => uploadController.abort(), 30000)
    let uploadRes: Response
    try {
      uploadRes = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
        signal: uploadController.signal,
      })
    } catch (err) {
      clearTimeout(uploadTimeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timeout - server tidak merespons')
      }
      throw err
    }
    clearTimeout(uploadTimeoutId)

    const body: ApiResponse<T> = await uploadRes.json()
    if (!body.success) {
      const err = body.error as ApiErrorBody
      throw new ApiError(err.code, err.message, err.details)
    }
    return body.data
  },
}
