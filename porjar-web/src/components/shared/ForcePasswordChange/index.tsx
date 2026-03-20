'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Lock, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Lemah', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Cukup', color: 'bg-amber-500' }
  if (score <= 3) return { score, label: 'Baik', color: 'bg-blue-500' }
  return { score, label: 'Kuat', color: 'bg-green-500' }
}

export function ForcePasswordChange() {
  const { user, setUser } = useAuthStore()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const strength = getPasswordStrength(newPassword)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!newPassword) newErrors.newPassword = 'Password baru wajib diisi'
    else if (newPassword.length < 8) newErrors.newPassword = 'Minimal 8 karakter'
    if (!confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi'
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Password tidak cocok'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/change-password', {
        old_password: user?.nisn || '',
        new_password: newPassword,
      })
      toast.success('Password berhasil diubah!')
      if (user) {
        setUser({ ...user, needs_password_change: false })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ general: err.message })
      } else {
        setErrors({ general: 'Gagal mengubah password. Coba lagi.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-porjar-border bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-porjar-red" />
        <div className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-porjar-red/10">
              <ShieldCheck size={28} weight="duotone" className="text-porjar-red" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-porjar-text">Ubah Password</h2>
              <p className="text-sm text-porjar-muted">
                Untuk keamanan, silakan ubah password default kamu
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-lg border-l-4 border-porjar-red bg-red-50 px-4 py-2.5 text-sm text-porjar-red">
                {errors.general}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-porjar-text">Password Baru</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-porjar-border bg-white pr-10 text-porjar-text placeholder:text-porjar-muted/50 focus:border-porjar-red focus:ring-porjar-red/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-porjar-muted hover:text-porjar-text"
                >
                  {showNew ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : 'bg-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-porjar-muted">Kekuatan: {strength.label}</p>
                </div>
              )}
              {errors.newPassword && (
                <p className="text-xs text-porjar-red">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-porjar-text">Konfirmasi Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-porjar-border bg-white pr-10 text-porjar-text placeholder:text-porjar-muted/50 focus:border-porjar-red focus:ring-porjar-red/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-porjar-muted hover:text-porjar-text"
                >
                  {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-porjar-red">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-porjar-red text-white hover:brightness-110"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" /> Menyimpan...
                </>
              ) : (
                <>
                  <Lock size={18} className="mr-1" /> Ubah Password
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
