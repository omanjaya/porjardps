'use client'

import { Suspense, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Client-side rate limiting: track failed attempts per email
  const failedAttemptsRef = useRef<Map<string, { count: number; lockedUntil: number }>>(new Map())
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const checkRateLimit = useCallback((targetEmail: string): boolean => {
    const entry = failedAttemptsRef.current.get(targetEmail)
    if (entry && entry.lockedUntil > Date.now()) {
      const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000)
      setCooldownRemaining(remaining)
      setErrors({ general: `Terlalu banyak percobaan gagal. Coba lagi dalam ${remaining} detik.` })
      // Update countdown
      const interval = setInterval(() => {
        const left = Math.ceil((entry.lockedUntil - Date.now()) / 1000)
        if (left <= 0) {
          setCooldownRemaining(0)
          setErrors({})
          clearInterval(interval)
        } else {
          setCooldownRemaining(left)
          setErrors({ general: `Terlalu banyak percobaan gagal. Coba lagi dalam ${left} detik.` })
        }
      }, 1000)
      return false
    }
    return true
  }, [])

  const recordFailedAttempt = useCallback((targetEmail: string) => {
    const entry = failedAttemptsRef.current.get(targetEmail) || { count: 0, lockedUntil: 0 }
    entry.count += 1
    if (entry.count >= 5) {
      entry.lockedUntil = Date.now() + 30000
      entry.count = 0
      setCooldownRemaining(30)
      setErrors({ general: 'Terlalu banyak percobaan gagal. Coba lagi dalam 30 detik.' })
      const interval = setInterval(() => {
        const left = Math.ceil((entry.lockedUntil - Date.now()) / 1000)
        if (left <= 0) {
          setCooldownRemaining(0)
          setErrors({})
          clearInterval(interval)
        } else {
          setCooldownRemaining(left)
          setErrors({ general: `Terlalu banyak percobaan gagal. Coba lagi dalam ${left} detik.` })
        }
      }, 1000)
    }
    failedAttemptsRef.current.set(targetEmail, entry)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Client-side rate limit check
    if (email && !checkRateLimit(email)) return

    // Client validation
    const newErrors: Record<string, string> = {}
    if (!email) newErrors.email = 'Email / NISN wajib diisi'
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

      // If user needs to change password, redirect to change-password page
      if (user?.needs_password_change) {
        router.push('/dashboard/change-password')
        return
      }

      // Use safe redirect param if present, otherwise use role-based default
      const safeRedirect = getSafeRedirect(searchParams.get('redirect'))
      if (safeRedirect) {
        router.push(safeRedirect)
        return
      }

      if (user?.role === 'admin' || user?.role === 'superadmin') {
        router.push('/admin')
      } else if ((user?.role as string) === 'coach') {
        router.push('/coach')
      } else {
        router.push('/dashboard')
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
    <div className="overflow-hidden rounded-xl border border-porjar-border bg-white shadow-md">
      <div className="h-1 w-full bg-porjar-red" />
      <div className="p-6">
        <h2 className="mb-1 text-xl font-bold uppercase tracking-wide text-porjar-text">Masuk</h2>
        <p className="mb-6 text-sm text-porjar-muted">
          Masuk ke akun PORJAR kamu
        </p>

        {isExpired && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>Sesi Anda telah berakhir. Silahkan login kembali.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-lg border-l-4 border-porjar-red bg-red-50 px-4 py-2.5 text-sm text-porjar-red">
              {errors.general}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-porjar-text">
              Email / NISN
            </label>
            <Input
              id="email"
              type="text"
              placeholder="email@example.com atau NISN"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-porjar-border bg-white text-porjar-text placeholder:text-porjar-muted/50 focus:border-porjar-red focus:ring-porjar-red/20"
            />
            <p className="text-[11px] text-porjar-muted">
              Gunakan NISN sebagai username jika belum punya email
            </p>
            {errors.email && (
              <p className="text-xs text-porjar-red">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-porjar-text">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-porjar-border bg-white text-porjar-text placeholder:text-porjar-muted/50 focus:border-porjar-red focus:ring-porjar-red/20"
            />
            {errors.password && (
              <p className="text-xs text-porjar-red">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-porjar-red text-white hover:brightness-110"
            disabled={isLoading || cooldownRemaining > 0}
          >
            {isLoading ? <><LoadingSpinner size="sm" className="text-white" /> Masuk...</> : 'Masuk'}
          </Button>

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-porjar-red hover:brightness-110">
              Lupa password?
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-porjar-muted">
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-porjar-red hover:brightness-110">
            Daftar
          </Link>
        </p>
      </div>
    </div>
  )
}
