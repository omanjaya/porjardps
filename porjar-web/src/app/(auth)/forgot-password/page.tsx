'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!email) newErrors.email = 'Email wajib diisi'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setIsSubmitted(true)
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

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm p-6">
      <h2 className="mb-1 text-xl font-semibold text-stone-900 dark:text-zinc-100">Lupa Password</h2>
      <p className="mb-6 text-sm text-stone-500 dark:text-zinc-400">
        Masukkan email untuk reset password
      </p>

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            Jika email terdaftar, link reset password telah dikirim.
          </div>
          <Link
            href="/login"
            className="block text-center text-sm font-medium text-esi-red hover:text-esi-red-dark"
          >
            Kembali ke halaman login
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
                {errors.general}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-stone-700 dark:text-zinc-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:border-esi-red"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-esi-red hover:bg-esi-red-dark text-white" disabled={isLoading}>
              {isLoading ? <><LoadingSpinner size="sm" className="text-white" /> Mengirim...</> : 'Kirim Link Reset'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-zinc-400">
            Ingat password?{' '}
            <Link href="/login" className="font-medium text-esi-red hover:text-esi-red-dark">
              Masuk
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
