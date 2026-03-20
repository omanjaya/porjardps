'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  function getPasswordStrength(pw: string) {
    if (!pw) return { level: 0, label: '', color: '' }
    const hasUpper = /[A-Z]/.test(pw)
    const hasNumber = /[0-9]/.test(pw)
    if (pw.length < 8) return { level: 1, label: 'Lemah', color: 'bg-red-500' }
    if (hasUpper && hasNumber) return { level: 3, label: 'Kuat', color: 'bg-green-500' }
    if (hasUpper || hasNumber) return { level: 2, label: 'Sedang', color: 'bg-amber-500' }
    return { level: 1, label: 'Lemah', color: 'bg-red-500' }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!token) newErrors.token = 'Token reset tidak ditemukan'
    if (!newPassword) newErrors.new_password = 'Password baru wajib diisi'
    else if (newPassword.length < 8) newErrors.new_password = 'Password minimal 8 karakter'
    if (!confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi'
    else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword })
      toast.success('Password berhasil direset! Silakan login.')
      router.push('/login')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          setErrors(err.details)
        } else {
          setErrors({ general: err.message })
        }
      } else {
        setErrors({ general: 'Terjadi kesalahan. Coba lagi nanti.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6">
        <h2 className="mb-1 text-xl font-semibold text-stone-900">Reset Password</h2>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Token reset tidak ditemukan. Pastikan link yang kamu gunakan benar.
        </div>
        <Link
          href="/forgot-password"
          className="mt-4 block text-center text-sm font-medium text-porjar-red hover:text-porjar-red-dark"
        >
          Minta link reset baru
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6">
      <h2 className="mb-1 text-xl font-semibold text-stone-900">Reset Password</h2>
      <p className="mb-6 text-sm text-stone-500">
        Masukkan password baru untuk akun kamu
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="new_password" className="text-sm font-medium text-stone-700">
            Password Baru
          </label>
          <Input
            id="new_password"
            type="password"
            placeholder="Minimal 8 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-porjar-red"
          />
          {newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= passwordStrength.level ? passwordStrength.color : 'bg-stone-200'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${
                passwordStrength.level === 1 ? 'text-red-500' :
                passwordStrength.level === 2 ? 'text-amber-500' : 'text-green-500'
              }`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
          {errors.new_password && (
            <p className="text-xs text-red-500">{errors.new_password}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-stone-700">
            Konfirmasi Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-porjar-red"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <Button type="submit" className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white" disabled={isLoading}>
          {isLoading ? <><LoadingSpinner size="sm" className="text-white" /> Menyimpan...</> : 'Reset Password'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Ingat password?{' '}
        <Link href="/login" className="font-medium text-porjar-red hover:text-porjar-red-dark">
          Masuk
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6 flex items-center justify-center">
        <LoadingSpinner size="sm" className="text-stone-400" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
