'use client'

import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { User, Camera, Lock, FloppyDisk, Eye, EyeSlash } from '@phosphor-icons/react'
import { api, ApiError, resolveMediaUrl } from '@/lib/api'
import { convertToWebP } from '@/lib/imageUtils'
import { useAuthStore } from '@/store/auth-store'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User as UserType } from '@/types'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  // Sync form fields when user data arrives (handles async store hydration)
  useEffect(() => {
    if (user) {
      setFullName(prev => prev || (user.full_name ?? ''))
      setPhone(prev => prev || (user.phone ?? ''))
    }
  }, [user])
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

  const avatarSrc = avatarPreview ?? resolveMediaUrl(user?.avatar_url)

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
        current_password: currentPassword,
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

        {/* Avatar */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 flex items-center gap-2">
            <User size={16} />
            Foto Profil
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover border-2 border-stone-200"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-200">
                  <User size={32} className="text-stone-400" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-porjar-red text-white shadow hover:bg-porjar-red-dark disabled:opacity-50 transition-colors"
              >
                <Camera size={14} />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">{user?.full_name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {uploadingAvatar ? 'Mengupload...' : 'Klik ikon kamera untuk mengubah foto'}
              </p>
              <p className="text-[10px] text-stone-300 mt-1">JPG, PNG, atau WebP · maks 5 MB · otomatis dikonversi ke WebP</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Profile info */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 flex items-center gap-2">
            <User size={16} />
            Informasi Profil
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Nama Lengkap</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap"
                className="border-stone-200 bg-white focus:border-porjar-red"
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Nomor Telepon</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xx-xxxx-xxxx"
                className="border-stone-200 bg-white focus:border-porjar-red"
                type="tel"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Email</label>
              <Input
                value={user?.email ?? ''}
                disabled
                className="border-stone-200 bg-stone-50 text-stone-400"
              />
              <p className="mt-1 text-[10px] text-stone-400">Email tidak dapat diubah</p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white"
            >
              <FloppyDisk size={15} className="mr-1.5" />
              {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
            </Button>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Lock size={16} />
            Ubah Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Password Saat Ini</label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password saat ini"
                  className="border-stone-200 bg-white pr-10 focus:border-porjar-red"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showCurrent ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Password Baru</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="border-stone-200 bg-white pr-10 focus:border-porjar-red"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showNew ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordStrength && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-stone-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: passwordStrength.label === 'Lemah' ? '25%' : passwordStrength.label === 'Cukup' ? '50%' : passwordStrength.label === 'Kuat' ? '75%' : '100%' }}
                    />
                  </div>
                  <span className="text-[10px] text-stone-500">{passwordStrength.label}</span>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Konfirmasi Password Baru</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="border-stone-200 bg-white focus:border-porjar-red"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-[10px] text-red-500">Password tidak cocok</p>
              )}
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white"
            >
              <Lock size={15} className="mr-1.5" />
              {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
            </Button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
