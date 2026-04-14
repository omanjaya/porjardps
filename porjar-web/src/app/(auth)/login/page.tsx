'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { EnvelopeSimple, Lock, Eye, EyeSlash } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><LoadingSpinner /></div>}>
      <LoginForm />
    </Suspense>
  )
}

const SAFE_PREFIXES = ['/dashboard', '/admin', '/coach', '/teams', '/games', '/schedule', '/matches', '/schools', '/rules', '/achievements', '/tournaments']

async function setupAdminPush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    await navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (!('Notification' in window) || Notification.permission !== 'default') return
    const permission = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission)
    if (permission !== 'granted') return
    const registration = await navigator.serviceWorker.ready
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090/api/v1'
    const response = await fetch(`${apiUrl}/push/vapid-public-key`)
    const json = await response.json()
    if (!json.success || !json.data?.public_key) return
    const padding = '='.repeat((4 - (json.data.public_key.length % 4)) % 4)
    const base64 = (json.data.public_key + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const applicationServerKey = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) applicationServerKey[i] = rawData.charCodeAt(i)
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
    }
    const subJson = subscription.toJSON()
    const csrfMatch = document.cookie.match(/(?:^|;\s*)porjar_csrf=([^;]*)/)
    const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : ''
    await fetch(`${apiUrl}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: { p256dh: subJson.keys?.p256dh ?? '', auth: subJson.keys?.auth ?? '' },
      }),
    })
  } catch {
    // silent fail — push is non-critical
  }
}

function getSafeRedirect(redirectParam: string | null): string | null {
  if (!redirectParam) return null
  // Only allow relative paths starting with / but not //
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) {
    return null
  }
  // Reject javascript: and other protocol injections embedded in path
  if (/^\/[a-z][a-z0-9+\-.]*:/i.test(redirectParam)) {
    return null
  }
  if (SAFE_PREFIXES.some(prefix => redirectParam === prefix || redirectParam.startsWith(prefix + '/'))) {
    return redirectParam
  }
  return null
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isExpired = searchParams.get('expired') === '1'
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Client-side rate limiting: track failed attempts per email
  const failedAttemptsRef = useRef<Map<string, { count: number; lockedUntil: number }>>(new Map())
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [])

  const startCountdown = useCallback((lockedUntil: number) => {
    // Clear any existing countdown before starting a new one
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
    countdownTimerRef.current = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (left <= 0) {
        setCooldownRemaining(0)
        setErrors({})
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
      } else {
        setCooldownRemaining(left)
        setErrors({ general: `Terlalu banyak percobaan gagal. Coba lagi dalam ${left} detik.` })
      }
    }, 1000)
  }, [])

  const checkRateLimit = useCallback((targetEmail: string): boolean => {
    const entry = failedAttemptsRef.current.get(targetEmail)
    if (entry && entry.lockedUntil > Date.now()) {
      const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000)
      setCooldownRemaining(remaining)
      setErrors({ general: `Terlalu banyak percobaan gagal. Coba lagi dalam ${remaining} detik.` })
      startCountdown(entry.lockedUntil)
      return false
    }
    return true
  }, [startCountdown])

  const recordFailedAttempt = useCallback((targetEmail: string) => {
    const entry = failedAttemptsRef.current.get(targetEmail) || { count: 0, lockedUntil: 0 }
    entry.count += 1
    if (entry.count >= 5) {
      entry.lockedUntil = Date.now() + 30000
      entry.count = 0
      setCooldownRemaining(30)
      setErrors({ general: 'Terlalu banyak percobaan gagal. Coba lagi dalam 30 detik.' })
      startCountdown(entry.lockedUntil)
    }
    failedAttemptsRef.current.set(targetEmail, entry)
  }, [startCountdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Client-side rate limit check
    if (email && !checkRateLimit(email)) return

    // Client validation
    const newErrors: Record<string, string> = {}
    if (!email) newErrors.email = 'Email wajib diisi'
    if (!password) newErrors.password = 'Password wajib diisi'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      const user = useAuthStore.getState().user
      toast.success('Login berhasil!')

      // Use safe redirect param if present, otherwise use role-based default
      const safeRedirect = getSafeRedirect(searchParams.get('redirect'))
      if (safeRedirect) {
        router.push(safeRedirect)
        return
      }

      if (user?.role === 'admin' || user?.role === 'superadmin') {
        // Register SW and prompt for push notifications in background
        setupAdminPush().catch(() => {})
        router.push('/admin')
      } else if ((user?.role as string) === 'coach') {
        router.push('/coach')
      } else if ((user?.role as string) === 'referee') {
        router.push('/referee')
      } else {
        // First-time player login → show welcome onboarding hero
        const seenKey = `porjar_seen_welcome_${user?.id ?? ''}`
        const alreadySeen = typeof window !== 'undefined' && localStorage.getItem(seenKey) === '1'
        if (!alreadySeen && user?.id) {
          try { localStorage.setItem(seenKey, '1') } catch {}
          router.push('/dashboard?welcome=1')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      recordFailedAttempt(email)
      if (err instanceof ApiError) {
        if (cooldownRemaining <= 0) {
          if (err.details) {
            setErrors(err.details)
          } else {
            setErrors({ general: err.message })
          }
        }
      } else {
        if (cooldownRemaining <= 0) {
          setErrors({ general: 'Terjadi kesalahan. Coba lagi nanti.' })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-zinc-800 ring-1 ring-stone-200/50 dark:ring-zinc-700/50 bg-white dark:bg-zinc-900 shadow-xl shadow-stone-200/50 dark:shadow-black/20">
      <div className="h-2 w-full bg-esi-red" />
      <div className="p-6 sm:p-8">
        <div className="mb-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/esi-denpasar.webp" alt="ESI Denpasar" className="h-12 w-12 object-contain" />
        </div>
        <h2 className="mb-1 text-xl font-bold uppercase tracking-wide text-esi-text">Masuk</h2>
        <p className="mb-6 text-sm text-esi-muted">
          Masuk ke akun ESI kamu
        </p>

        {isExpired && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>Sesi Anda telah berakhir. Silahkan login kembali.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-lg border-l-4 border-esi-red bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-sm text-esi-red">
              {errors.general}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-esi-text">
              Email atau Username
            </label>
            <div className="relative">
              <EnvelopeSimple weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/40" />
              <Input
                id="email"
                type="text"
                placeholder="email@kamu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 sm:h-12 pl-9 border-esi-border bg-white dark:bg-zinc-800 dark:text-zinc-100 text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:ring-2 focus:ring-esi-red/20 transition-all duration-200"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-esi-red">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-esi-text">
              Password
            </label>
            <div className="relative">
              <Lock weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/40" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 sm:h-12 pl-9 pr-10 border-esi-border bg-white dark:bg-zinc-800 dark:text-zinc-100 text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:ring-2 focus:ring-esi-red/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-esi-muted/60 hover:text-esi-text transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeSlash weight="bold" className="h-4 w-4" /> : <Eye weight="bold" className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-esi-red">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full bg-esi-red text-base font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all duration-200"
            disabled={isLoading || cooldownRemaining > 0}
          >
            {isLoading ? <><LoadingSpinner size="sm" className="text-white" /> Masuk...</> : 'Masuk'}
          </Button>

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-esi-red hover:brightness-110">
              Lupa password?
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-esi-muted">
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-esi-red hover:brightness-110">
            Daftar
          </Link>
        </p>

        <p className="text-center text-xs text-stone-400 dark:text-zinc-500 mt-6">
          Sudah 2.000+ pelajar bergabung di ESI Denpasar
        </p>
      </div>
    </div>
  )
}
