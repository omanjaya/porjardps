'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const strength = getPasswordStrength(newPassword)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!oldPassword) newErrors.oldPassword = 'Password saat ini wajib diisi'
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
      await api.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      toast.success('Password berhasil diubah!')
      if (user) {
        setUser({ ...user, needs_password_change: false })
      }
      router.push(user?.role === 'coach' ? '/coach' : '/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_OLD_PASSWORD') {
          setErrors({ oldPassword: 'Password / NISN salah' })
        } else if (err.code === 'VALIDATION_ERROR' && err.details) {
          const fieldErrors: Record<string, string> = {}
          if (err.details.old_password) fieldErrors.oldPassword = err.details.old_password
          if (err.details.new_password) fieldErrors.newPassword = err.details.new_password
          setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { general: err.message })
        } else {
          setErrors({ general: err.message })
        }
      } else {
        setErrors({ general: 'Gagal mengubah password. Coba lagi.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-esi-border bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="h-1.5 w-full bg-esi-red" />
        <div className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-esi-red/10">
              <ShieldCheck size={28} weight="duotone" className="text-esi-red" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-esi-text">Ubah Password</h2>
              <p className="text-sm text-esi-muted">
                Untuk keamanan, silakan ubah password default kamu
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-lg border-l-4 border-esi-red bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-sm text-esi-red">
                {errors.general}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-esi-text">Password Saat Ini</label>
              <div className="relative">
                <Input
                  type={showOld ? 'text' : 'password'}
                  placeholder="Masukkan NISN kamu"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="border-esi-border bg-white dark:bg-zinc-800 pr-10 text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:ring-esi-red/20"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-esi-muted hover:text-esi-text"
                >
                  {showOld ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-amber-600">Gunakan NISN sebagai password default</p>
              {errors.oldPassword && (
                <p className="text-xs text-esi-red">{errors.oldPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-esi-text">Password Baru</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-esi-border bg-white dark:bg-zinc-800 pr-10 text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:ring-esi-red/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-esi-muted hover:text-esi-text"
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
                          i <= strength.score ? strength.color : 'bg-stone-200 dark:bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-esi-muted">Kekuatan: {strength.label}</p>
                </div>
              )}
              {errors.newPassword && (
                <p className="text-xs text-esi-red">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-esi-text">Konfirmasi Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-esi-border bg-white dark:bg-zinc-800 pr-10 text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:ring-esi-red/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-esi-muted hover:text-esi-text"
                >
                  {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-esi-red">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-esi-red text-white hover:brightness-110"
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
