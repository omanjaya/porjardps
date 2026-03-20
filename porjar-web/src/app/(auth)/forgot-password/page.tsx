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
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6">
      <h2 className="mb-1 text-xl font-semibold text-stone-900">Lupa Password</h2>
      <p className="mb-6 text-sm text-stone-500">
        Masukkan email untuk reset password
      </p>

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Jika email terdaftar, link reset password telah dikirim.
          </div>
          <Link
            href="/login"
            className="block text-center text-sm font-medium text-porjar-red hover:text-porjar-red-dark"
          >
            Kembali ke halaman login
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {errors.general}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-stone-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-porjar-red"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white" disabled={isLoading}>
              {isLoading ? <><LoadingSpinner size="sm" className="text-white" /> Mengirim...</> : 'Kirim Link Reset'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Ingat password?{' '}
            <Link href="/login" className="font-medium text-porjar-red hover:text-porjar-red-dark">
              Masuk
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
