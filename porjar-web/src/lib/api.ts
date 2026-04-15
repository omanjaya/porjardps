import type { ApiResponse, ApiErrorBody } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (() => {
  if (process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required')
  return 'http://localhost:9090/api/v1'
})()
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
    setCookie('access_token', token, 7200)
  } else {
    removeCookie('access_token')
    removeCookie('user_role')
  }
}

/**
 * Hydrate the in-memory access token from the access_token cookie.
 * Called on page load to avoid an unnecessary refresh round-trip.
 */
export function migrateOldCookieToken(): void {
  if (accessToken) return
  if (typeof document === 'undefined') return
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)
  if (match) {
    accessToken = decodeURIComponent(match[1])
  }
}

export function setUserRoleCookie(role: string | null) {
  if (role) {
    setCookie('user_role', role, 7200)
  } else {
    removeCookie('user_role')
  }
}

export function getAccessToken(): string | null {
  return accessToken
}

export function getStoredRefreshToken(): string | null {
  return null
}

export function setStoredRefreshToken(_token: string | null) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RT_KEY)
  }
}

// ── Single shared refresh with dedup lock ──
let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = doRefresh()
  const result = await refreshPromise
  refreshPromise = null
  return result
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) return false
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

// ── In-flight GET deduplication ──
// Prevents duplicate concurrent GET requests to the same endpoint.
const inflightGets = new Map<string, Promise<unknown>>()

// ── Shared fetch with timeout, auth, CSRF, and 401 auto-refresh ──
async function fetchWithAuth(
  url: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = 30000, ...fetchOpts } = options

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (fetchOpts.method || 'GET').toUpperCase()
  )

  const csrfToken = isMutation ? getCSRFToken() : ''
  if (isMutation && !csrfToken) {
    console.warn('[api] CSRF token is empty for mutation — server will validate and reject if required')
  }

  const headers: Record<string, string> = {
    ...(fetchOpts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(isMutation ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(fetchOpts.headers as Record<string, string> ?? {}),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      ...fetchOpts,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return res
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout - server tidak merespons')
    }
    throw err
  }
}

// ── Handle 401 auto-refresh ──
async function handle401(errCode: string): Promise<boolean> {
  if (errCode === 'INVALID_CREDENTIALS' || errCode === 'ACCOUNT_LOCKED') return false
  const refreshed = await refreshSession()
  if (!refreshed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
  }
  return refreshed
}

// ── Core API request with auto-refresh ──
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const res = await fetchWithAuth(url, options)

  if (res.status === 204) return undefined as T

  const body: ApiResponse<T> = await res.json()

  if (!body.success) {
    const err = body.error as ApiErrorBody
    if (res.status === 401) {
      const refreshed = await handle401(err.code)
      if (refreshed) return apiRequest<T>(endpoint, options)
    }
    throw new ApiError(err.code, err.message, err.details)
  }

  return body.data
}

// ── Typed API methods ──
export const api = {
  get<T>(endpoint: string): Promise<T> {
    // Deduplicate concurrent identical GET requests
    const existing = inflightGets.get(endpoint)
    if (existing) return existing as Promise<T>

    const promise = apiRequest<T>(endpoint, { method: 'GET' }).finally(() => {
      inflightGets.delete(endpoint)
    })
    inflightGets.set(endpoint, promise)
    return promise
  },

  async getPaginated<T>(endpoint: string): Promise<{ data: T; meta: { page: number; per_page: number; total: number; total_pages: number } | null }> {
    const url = `${API_URL}${endpoint}`
    const res = await fetchWithAuth(url, { method: 'GET' })

    if (res.status === 401) {
      const body401 = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Unknown error' } }))
      const errCode = body401?.error?.code
      const refreshed = await handle401(errCode)
      if (refreshed) return api.getPaginated<T>(endpoint)
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

  delete<T>(endpoint: string, data?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${API_URL}${endpoint}`
    const res = await fetchWithAuth(url, {
      method: 'POST',
      body: formData,
    })

    const body: ApiResponse<T> = await res.json()
    if (!body.success) {
      const err = body.error as ApiErrorBody
      if (res.status === 401) {
        const refreshed = await handle401(err.code)
        if (refreshed) return api.upload<T>(endpoint, file)
      }
      throw new ApiError(err.code, err.message, err.details)
    }
    return body.data
  },

  async getBlob(endpoint: string): Promise<Blob> {
    const url = `${API_URL}${endpoint}`
    const res = await fetchWithAuth(url, { method: 'GET' })
    if (!res.ok) {
      throw new Error(`Failed to download: ${res.status}`)
    }
    return res.blob()
  },
}
