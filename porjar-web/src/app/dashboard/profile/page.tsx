'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Camera, Lock, FloppyDisk, Eye, EyeSlash, Shield, Sword, CalendarBlank, CheckCircle, BellSimple } from '@phosphor-icons/react'
import Link from 'next/link'
import { api, ApiError, resolveMediaUrl } from '@/lib/api'
import { convertToWebP } from '@/lib/imageUtils'
import { useAuthStore } from '@/store/auth-store'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User as UserType } from '@/types'
import {
  isPushSupported,
  isSubscribed as checkPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  getVapidKey,
} from '@/lib/pushNotifications'

interface ProfileTeamInfo {
  id: string
  name: string
  game_name: string
  role: string
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromIntent = searchParams?.get('from') ?? null

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [teamInfo, setTeamInfo] = useState<ProfileTeamInfo | null>(null)

  // Sync form fields when user data arrives (handles async store hydration)
  useEffect(() => {
    if (user) {
      setFullName(prev => prev || (user.full_name ?? ''))
      setPhone(prev => prev || (user.phone ?? ''))
    }
  }, [user])

  // Load team info
  useEffect(() => {
    api
      .get<{ team: ProfileTeamInfo | null }>('/player/dashboard')
      .then((res) => {
        if (res.team) {
          setTeamInfo(res.team)
        }
      })
      .catch(() => {})
  }, [])

  const [savingProfile, setSavingProfile] = useState(false)

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Push notification toggle
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [togglingPush, setTogglingPush] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkPush() {
      if (!isPushSupported()) return
      const key = await getVapidKey()
      if (!key || cancelled) return
      setPushSupported(true)
      const sub = await checkPushSubscribed()
      if (!cancelled) setPushSubscribed(sub)
    }
    checkPush()
    return () => { cancelled = true }
  }, [])

  async function handleTogglePush() {
    setTogglingPush(true)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush()
        setPushSubscribed(false)
        toast.success('Notifikasi push dimatikan')
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.')
          return
        }
        const sub = await subscribeToPush()
        if (sub) {
          setPushSubscribed(true)
          toast.success('Notifikasi push diaktifkan')
        } else {
          toast.error('Gagal mengaktifkan notifikasi')
        }
      }
    } catch {
      toast.error('Gagal mengubah pengaturan notifikasi')
    } finally {
      setTogglingPush(false)
    }
  }

  const avatarSrc = avatarPreview ?? resolveMediaUrl(user?.avatar_url)

  // Profile completion tracking — 5 logical fields
  const completion = useMemo(() => {
    const checks = {
      full_name: !!fullName.trim() && fullName.trim().length >= 2,
      phone: !!phone.trim() && phone.trim().length >= 6,
      nisn: !!user?.nisn && user.nisn.trim().length > 0,
      school: !!user?.tingkat, // proxy until school_id field exists
      date_of_birth: false, // not yet in user model
    }
    const filled = Object.values(checks).filter(Boolean).length
    return { checks, filled, total: 5 }
  }, [fullName, phone, user?.nisn, user?.tingkat])

  const nameMissing = !completion.checks.full_name
  const phoneMissing = !completion.checks.phone

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5 MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const webp = await convertToWebP(file, { maxSize: 800, quality: 0.88 })
      const preview = URL.createObjectURL(webp)
      setAvatarPreview(preview)

      const uploaded = await api.upload<{ url: string }>('/upload', webp)
      const updated = await api.put<UserType>('/auth/me', { avatar_url: uploaded.url })
      setUser(updated)
      toast.success('Foto profil diperbarui')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengupload foto')
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveProfile() {
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Nama lengkap minimal 2 karakter')
      return
    }
    setSavingProfile(true)
    try {
      const updated = await api.put<UserType>('/auth/me', {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      setUser(updated)
      toast.success('Profil berhasil disimpan')
      // Honor return-to-intent from ProfileCompletionGate
      if (fromIntent === 'team-create') {
        router.push('/dashboard/teams/create')
      } else if (fromIntent === 'event-register') {
        router.back()
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan profil')
    } finally {
      setSavingProfile(false)
    }
  }

  const passwordStrength = (() => {
    if (!newPassword) return null
    let score = 0
    if (newPassword.length >= 8) score++
    if (/[A-Z]/.test(newPassword)) score++
    if (/[0-9]/.test(newPassword)) score++
    if (/[^A-Za-z0-9]/.test(newPassword)) score++
    if (score <= 1) return { label: 'Lemah', color: 'bg-red-400' }
    if (score === 2) return { label: 'Cukup', color: 'bg-amber-400' }
    if (score === 3) return { label: 'Kuat', color: 'bg-emerald-400' }
    return { label: 'Sangat Kuat', color: 'bg-emerald-500' }
  })()

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Semua kolom password harus diisi')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter')
      return
    }
    setSavingPassword(true)
    try {
      await api.put('/auth/change-password', {
        old_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Password berhasil diubah')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Profil Saya"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profil' }]}
      />

      <div className="max-w-xl space-y-6">

        {/* Profile Header with gradient */}
        <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
          {/* Gradient banner */}
          <div className="h-20 bg-gradient-to-r from-esi-red/80 via-esi-red/60 to-amber-500/50" />

          {/* Avatar + info overlapping the banner */}
          <div className="relative px-6 pb-5">
            <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 -mt-10">
              <div className="relative shrink-0">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-20 w-20 rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-md"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-md">
                    <User size={32} className="text-stone-400 dark:text-zinc-500" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-esi-red text-white shadow hover:bg-esi-red-dark disabled:opacity-50 transition-colors"
                >
                  <Camera size={14} />
                </button>
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-base font-bold text-stone-800 dark:text-zinc-100 truncate">{user?.full_name}</h2>
                  {/* Role badge */}
                  <span className="inline-flex items-center gap-1 rounded-full border border-esi-red/20 bg-esi-red/5 px-2 py-0.5 text-[10px] font-semibold text-esi-red capitalize">
                    <Shield size={10} weight="fill" />
                    {user?.role === 'player' ? 'Player' : user?.role ?? 'Player'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">
                  {user?.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {/* Team badge */}
                  {teamInfo && (
                    <Link
                      href="/dashboard/teams"
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      <Sword size={11} weight="bold" />
                      {teamInfo.name}
                    </Link>
                  )}
                  {/* Member since */}
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 dark:text-zinc-500">
                    <CalendarBlank size={11} />
                    Member sejak 2025
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center sm:text-left text-[10px] text-stone-300 dark:text-zinc-600">
              {uploadingAvatar ? 'Mengupload...' : 'Klik ikon kamera untuk mengubah foto'} · JPG, PNG, atau WebP · maks 5 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Profile completion progress */}
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-stone-700 dark:text-zinc-300 flex items-center gap-1.5">
              <CheckCircle size={14} weight={completion.filled === completion.total ? 'fill' : 'regular'} className={completion.filled === completion.total ? 'text-green-500' : 'text-stone-400 dark:text-zinc-500'} />
              Kelengkapan Profil
            </p>
            <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">
              {completion.filled} dari {completion.total} field terisi
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all ${completion.filled === completion.total ? 'bg-green-500' : 'bg-esi-red'}`}
              style={{ width: `${(completion.filled / completion.total) * 100}%` }}
            />
          </div>
          {completion.filled < completion.total && (
            <p className="mt-2 text-[11px] text-stone-500 dark:text-zinc-500">
              Lengkapi profil agar tim kamu bisa diverifikasi admin dengan cepat.
            </p>
          )}
        </div>

        {/* Profile info */}
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-zinc-300 flex items-center gap-2">
            <User size={16} />
            Informasi Profil
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">Nama Lengkap</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap"
                className={`bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:border-esi-red ${nameMissing ? 'border-red-400 dark:border-red-500' : 'border-stone-200 dark:border-zinc-700'}`}
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">Nomor Telepon</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xx-xxxx-xxxx"
                className={`bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:border-esi-red ${phoneMissing ? 'border-red-400 dark:border-red-500' : 'border-stone-200 dark:border-zinc-700'}`}
                type="tel"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">Email</label>
              <Input
                value={user?.email ?? ''}
                disabled
                className="border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 text-stone-400 dark:text-zinc-500"
              />
              <p className="mt-1 text-[10px] text-stone-400 dark:text-zinc-500">Email tidak dapat diubah</p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full bg-esi-red hover:bg-esi-red-dark text-white"
            >
              <FloppyDisk size={15} className="mr-1.5" />
              {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
            </Button>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-zinc-300 flex items-center gap-2">
            <Lock size={16} />
            Ubah Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">Password Saat Ini</label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password saat ini"
                  className="border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 pr-10 focus:border-esi-red"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300"
                >
                  {showCurrent ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">Password Baru</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 pr-10 focus:border-esi-red"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 hover:text-stone-600 dark:hover:text-zinc-300"
                >
                  {showNew ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordStrength && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: passwordStrength.label === 'Lemah' ? '25%' : passwordStrength.label === 'Cukup' ? '50%' : passwordStrength.label === 'Kuat' ? '75%' : '100%' }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-zinc-400">{passwordStrength.label}</span>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-zinc-400">Konfirmasi Password Baru</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:border-esi-red"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-[10px] text-red-500">Password tidak cocok</p>
              )}
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-esi-red hover:bg-esi-red-dark text-white"
            >
              <Lock size={15} className="mr-1.5" />
              {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
            </Button>
          </div>
        </div>

        {/* Push notification toggle — only shown when VAPID is configured */}
        {pushSupported && (
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-zinc-300 flex items-center gap-2">
              <BellSimple size={16} />
              Notifikasi Push
            </h2>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-700 dark:text-zinc-300">
                  Terima notifikasi jadwal dan hasil pertandingan
                </p>
                <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">
                  {pushSubscribed ? 'Notifikasi aktif di perangkat ini' : 'Notifikasi tidak aktif'}
                </p>
              </div>
              <button
                onClick={handleTogglePush}
                disabled={togglingPush}
                role="switch"
                aria-checked={pushSubscribed}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                  pushSubscribed ? 'bg-esi-red' : 'bg-stone-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                    pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
