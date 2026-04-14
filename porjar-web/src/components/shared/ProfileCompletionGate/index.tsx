'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { UserCircle, WarningCircle, ArrowRight, X } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import type { User } from '@/types'

type FieldKey = 'full_name' | 'phone' | 'tingkat' | 'nisn' | 'school' | 'date_of_birth'

interface ProfileCompletionGateProps {
  children: React.ReactNode
  /**
   * Required user fields. Defaults to ['full_name','phone','tingkat'] which are
   * the fields exposed by the API today. NISN/school/date_of_birth are shown in
   * the friendly missing list as guidance even if the API does not return them.
   */
  requiredFields?: FieldKey[]
  /** Where to send user to complete profile (will preserve intent via ?from=...) */
  from?: string
}

const FIELD_LABELS: Record<FieldKey, string> = {
  full_name: 'Nama Lengkap',
  phone: 'Nomor Telepon',
  tingkat: 'Kelas / Tingkat',
  nisn: 'NISN',
  school: 'Sekolah',
  date_of_birth: 'Tanggal Lahir',
}

function isFieldFilled(user: User | null, field: FieldKey): boolean {
  if (!user) return false
  switch (field) {
    case 'full_name':
      return !!user.full_name && user.full_name.trim().length >= 2
    case 'phone':
      return !!user.phone && user.phone.trim().length >= 6
    case 'tingkat':
      return !!user.tingkat && user.tingkat.trim().length > 0
    case 'nisn':
      return !!user.nisn && user.nisn.trim().length > 0
    // API does not yet return these fields — treated as "unknown / not filled"
    // unless future user model exposes them.
    case 'school':
    case 'date_of_birth':
      return false
  }
}

const SESSION_DISMISS_KEY = 'porjar_profile_gate_dismissed'

export function ProfileCompletionGate({
  children,
  requiredFields = ['full_name', 'phone', 'tingkat'],
  from = 'team-create',
}: ProfileCompletionGateProps) {
  const { user, fetchMe } = useAuthStore()
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Refresh /me once on mount to ensure latest profile fields
  useEffect(() => {
    fetchMe().finally(() => setHydrated(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(SESSION_DISMISS_KEY) === '1')
  }, [])

  const missing = useMemo(
    () => requiredFields.filter((f) => !isFieldFilled(user, f)),
    [user, requiredFields]
  )

  // Always show what is logically required (NISN, Nama, Sekolah) in the friendly list
  // when user is missing any of the verifiable fields.
  const displayMissing = useMemo(() => {
    if (missing.length === 0) return []
    const guidance: FieldKey[] = ['nisn', 'full_name', 'school']
    const set = new Set<FieldKey>([...missing, ...guidance])
    return Array.from(set)
  }, [missing])

  if (!hydrated) return null
  if (!user) return <>{children}</>
  if (missing.length === 0) return <>{children}</>

  if (dismissed) return <>{children}</>

  const profileHref = `/dashboard/profile?from=${encodeURIComponent(from)}`

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
    }
    setDismissed(true)
  }

  return (
    <div className="relative">
      {/* Dimmed content underneath */}
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">
        {children}
      </div>

      {/* Overlay card */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 px-4 py-6 sm:p-6">
        <div className="relative w-full max-w-md rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup"
            className="absolute right-3 top-3 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <WarningCircle size={22} weight="fill" className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100">
                Lengkapi profil dulu untuk melanjutkan
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
                Beberapa data profil belum terisi. Profil yang lengkap dibutuhkan agar
                anggota tim bisa diverifikasi oleh admin.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
              Yang perlu dilengkapi
            </p>
            <ul className="mt-2 space-y-1.5">
              {displayMissing.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-stone-700 dark:text-zinc-300"
                >
                  <UserCircle size={14} className="text-esi-red shrink-0" />
                  {FIELD_LABELS[f]}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-300"
            >
              Nanti saja
            </Button>
            <Link href={profileHref} className="sm:flex-shrink-0">
              <Button
                type="button"
                className="w-full bg-esi-red hover:bg-esi-red-dark text-white"
              >
                Lengkapi Sekarang
                <ArrowRight size={15} className="ml-1.5" weight="bold" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileCompletionGate
