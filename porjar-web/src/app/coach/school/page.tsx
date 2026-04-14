'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { GraduationCap, Camera, Trash, SpinnerGap } from '@phosphor-icons/react'
import { CoachLayout } from '@/components/layouts/CoachLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError, resolveMediaUrl } from '@/lib/api'
import { convertToWebP } from '@/lib/imageUtils'
import type { School } from '@/types'

export default function CoachSchoolPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null)

  useEffect(() => {
    loadSchools()
  }, [])

  async function loadSchools() {
    try {
      const result = await api.get<{ school: School }[]>('/coach/dashboard')
      if (Array.isArray(result)) {
        const schoolList = result
          .map((d) => d.school)
          .filter((s): s is School => s != null)
        // Deduplicate by ID
        const seen = new Set<string>()
        const unique = schoolList.filter((s) => {
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        })
        setSchools(unique)
      }
    } catch {
      toast.error('Gagal memuat data sekolah')
    } finally {
      setLoading(false)
    }
  }

  function handleUploadClick(schoolId: string) {
    setActiveSchoolId(schoolId)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeSchoolId) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5 MB')
      return
    }

    setUploadingId(activeSchoolId)
    try {
      const webp = await convertToWebP(file, { maxSize: 800, quality: 0.88 })
      const uploaded = await api.upload<{ url: string }>('/upload', webp)
      const updated = await api.put<School>(`/schools/${activeSchoolId}/logo`, {
        logo_url: uploaded.url,
      })
      setSchools((prev) =>
        prev.map((s) => (s.id === activeSchoolId ? { ...s, logo_url: updated.logo_url } : s))
      )
      toast.success('Logo sekolah berhasil diperbarui')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengupload logo')
    } finally {
      setUploadingId(null)
      setActiveSchoolId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveLogo(schoolId: string) {
    setUploadingId(schoolId)
    try {
      await api.put<School>(`/schools/${schoolId}/logo`, { logo_url: '' })
      setSchools((prev) =>
        prev.map((s) => (s.id === schoolId ? { ...s, logo_url: null } : s))
      )
      toast.success('Logo sekolah dihapus')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus logo')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <CoachLayout>
      <PageHeader
        title="Pengaturan Sekolah"
        description="Kelola logo dan informasi sekolah"
        breadcrumbs={[
          { label: 'Dashboard', href: '/coach' },
          { label: 'Sekolah' },
        ]}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl bg-esi-border" />
        </div>
      ) : schools.length === 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
          <GraduationCap size={32} weight="duotone" className="mx-auto mb-2 text-esi-border" />
          <p className="text-sm text-esi-muted">
            Belum ada sekolah yang ditugaskan ke akun Anda
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schools.map((school) => {
            const logoSrc = resolveMediaUrl(school.logo_url)
            const isUploading = uploadingId === school.id

            return (
              <div
                key={school.id}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Logo preview */}
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
                    {isUploading ? (
                      <SpinnerGap size={28} className="animate-spin text-esi-red" />
                    ) : logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={school.name}
                        className="h-full w-full rounded-xl object-contain p-1"
                      />
                    ) : (
                      <GraduationCap size={32} weight="duotone" className="text-stone-300 dark:text-zinc-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-esi-text">{school.name}</h3>
                    <p className="text-sm text-esi-muted">
                      {school.level} &middot; {school.city}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-esi-red hover:bg-esi-red-dark text-white"
                        onClick={() => handleUploadClick(school.id)}
                        disabled={isUploading}
                      >
                        <Camera size={14} className="mr-1" />
                        {school.logo_url ? 'Ganti Logo' : 'Upload Logo'}
                      </Button>
                      {school.logo_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:bg-red-950"
                          onClick={() => handleRemoveLogo(school.id)}
                          disabled={isUploading}
                        >
                          <Trash size={14} className="mr-1" />
                          Hapus Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </CoachLayout>
  )
}
