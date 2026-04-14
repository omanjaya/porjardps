'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { User, EnvelopeSimple, Phone, Lock, Eye, EyeSlash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuthStore()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)

  function getPasswordStrength(pw: string) {
    if (!pw) return { level: 0, label: '', color: '' }
    const hasUpper = /[A-Z]/.test(pw)
    const hasNumber = /[0-9]/.test(pw)
    if (pw.length < 8) return { level: 1, label: 'Lemah', color: 'bg-esi-red' }
    if (hasUpper && hasNumber) return { level: 3, label: 'Kuat', color: 'bg-green-500' }
    if (hasUpper || hasNumber) return { level: 2, label: 'Sedang', color: 'bg-amber-500' }
    return { level: 1, label: 'Lemah', color: 'bg-esi-red' }
  }

  const passwordStrength = getPasswordStrength(form.password)

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Client validation
    const newErrors: Record<string, string> = {}
    if (!form.full_name) newErrors.full_name = 'Nama lengkap wajib diisi'
    if (!form.email) newErrors.email = 'Email wajib diisi'
    if (!form.password) newErrors.password = 'Password wajib diisi'
    if (form.password.length < 8) newErrors.password = 'Password minimal 8 karakter'
    if (!form.confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi'
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok'
    }
    if (!consentGiven) {
      newErrors.consent_given = 'Persetujuan penggunaan data diperlukan untuk mendaftar'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      await register({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        consent_given: consentGiven,
      })
      toast.success('Akun berhasil dibuat!')
      // Try auto-login so user lands directly on onboarding dashboard
      try {
        await useAuthStore.getState().login(form.email, form.password)
        router.push('/dashboard?welcome=1')
      } catch {
        router.push('/login')
      }
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

  const inputClasses = "h-11 sm:h-12 pl-9 border-esi-border bg-white dark:bg-zinc-800 dark:text-zinc-100 text-esi-text placeholder:text-esi-muted/50 focus:border-esi-red focus:ring-2 focus:ring-esi-red/20 transition-all duration-200"

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl shadow-stone-200/50 dark:shadow-black/20">
      <div className="h-2 w-full bg-esi-red" />
      <div className="p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-bold uppercase tracking-wide text-esi-text">Buat Akun</h2>
        <p className="mb-4 text-sm text-esi-muted">
          Langkah 1 dari 3: Buat akun, lalu buat tim, lalu registrasi ke event
        </p>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[
            { num: 1, label: 'Buat Akun' },
            { num: 2, label: 'Buat Tim' },
            { num: 3, label: 'Registrasi' },
          ].map((step) => (
            <div key={step.num} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all',
                  step.num === 1
                    ? 'bg-esi-red text-white shadow-md shadow-red-500/20'
                    : 'bg-stone-200 text-stone-500 dark:bg-zinc-700 dark:text-zinc-400'
                )}>
                  {step.num}
                </div>
                <span className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  step.num === 1 ? 'text-esi-red' : 'text-esi-muted'
                )}>
                  {step.label}
                </span>
              </div>
              {step.num < 3 && <div className="mb-4 h-0.5 w-8 bg-stone-200 dark:bg-zinc-700" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-lg border-l-4 border-esi-red bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-sm text-esi-red">
              {errors.general}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-sm font-medium text-esi-text">
              Nama Lengkap
            </label>
            <div className="relative">
              <User weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/60" />
              <Input
                id="full_name"
                type="text"
                placeholder="Nama lengkap"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className={inputClasses}
              />
            </div>
            {errors.full_name && (
              <p className="text-xs text-esi-red">{errors.full_name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-esi-text">
              Email
            </label>
            <div className="relative">
              <EnvelopeSimple weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/60" />
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClasses}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-esi-red">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-esi-text">
              No. Telepon <span className="text-esi-muted">(opsional)</span>
            </label>
            <div className="relative">
              <Phone weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/60" />
              <Input
                id="phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={inputClasses}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-esi-red">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-esi-text">
              Password
            </label>
            <div className="relative">
              <Lock weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/60" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={cn(inputClasses, 'pr-10')}
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
            {form.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= passwordStrength.level ? passwordStrength.color : 'bg-esi-border'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.level === 1 ? 'text-esi-red' :
                  passwordStrength.level === 2 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-esi-red">{errors.password}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-esi-text">
              Konfirmasi Password
            </label>
            <div className="relative">
              <Lock weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-esi-muted/60" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className={cn(inputClasses, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-esi-muted/60 hover:text-esi-text transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showConfirmPassword ? <EyeSlash weight="bold" className="h-4 w-4" /> : <Eye weight="bold" className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-esi-red">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent"
                required
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-esi-red focus:ring-esi-red"
              />
              <label htmlFor="consent" className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
                Saya menyetujui{' '}
                <a href="/privacy" className="text-esi-red underline">kebijakan privasi</a>
                {' '}dan penggunaan data pribadi saya sesuai UU PDP No. 27 Tahun 2022.
              </label>
            </div>
            {errors.consent_given && (
              <p className="text-xs text-esi-red">{errors.consent_given}</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full bg-esi-red text-base font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:brightness-110 transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? <><LoadingSpinner size="sm" className="text-white" /> Membuat akun...</> : 'Buat Akun & Lanjut'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-esi-muted">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-esi-red hover:brightness-110">
            Masuk
          </Link>
        </p>

        <p className="text-center text-xs text-stone-400 dark:text-zinc-500 mt-6">
          Sudah 2.000+ pelajar bergabung di ESI Denpasar
        </p>
      </div>
    </div>
  )
}
