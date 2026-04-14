'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProfileCompletionGate } from '@/components/shared/ProfileCompletionGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, MagnifyingGlass, PaperPlaneTilt, Info, Users, GameController, Buildings, ArrowSquareOut } from '@phosphor-icons/react'
import type { Game, School, SchoolLevel } from '@/types'

const SCHOOL_LEVELS: { value: SchoolLevel; label: string }[] = [
  { value: 'SD', label: 'SD' },
  { value: 'SMP', label: 'SMP' },
  { value: 'MTs', label: 'MTs' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMK', label: 'SMK' },
  { value: 'MA', label: 'MA' },
]

export default function CreateTeamPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [games, setGames] = useState<Game[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [teamName, setTeamName] = useState('')
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')

  // School combobox state
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false)
  const [selectedSchoolName, setSelectedSchoolName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // School request mode
  const [requestMode, setRequestMode] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestLevel, setRequestLevel] = useState<string>('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    async function load() {
      try {
        const [g, s] = await Promise.all([
          api.get<Game[]>('/games'),
          api.get<School[]>('/schools?per_page=500'),
        ])
        setGames((g ?? []).filter((game) => game.is_active))
        setSchools(s ?? [])
      } catch {
        toast.error('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAuthenticated, authLoading])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSchoolDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools
    const q = schoolSearch.toLowerCase()
    return schools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.level.toLowerCase().includes(q)
    )
  }, [schools, schoolSearch])

  function selectSchool(school: School) {
    setSelectedSchoolId(school.id)
    setSelectedSchoolName(`${school.name} (${school.level})`)
    setSchoolSearch('')
    setSchoolDropdownOpen(false)
    setRequestMode(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!teamName.trim()) {
      toast.error('Nama tim wajib diisi')
      return
    }
    if (!selectedGameId) {
      toast.error('Pilih cabang e-sport')
      return
    }
    if (!selectedSchoolId) {
      toast.error('Pilih sekolah')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/teams', {
        name: teamName.trim(),
        game_id: selectedGameId,
        school_id: selectedSchoolId,
      })
      toast.success('Tim berhasil dibuat! Menunggu persetujuan admin.')
      router.push('/dashboard/teams')
    } catch {
      toast.error('Gagal membuat tim')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSchoolRequest() {
    if (!requestName.trim()) {
      toast.error('Nama sekolah wajib diisi')
      return
    }
    if (!requestLevel) {
      toast.error('Pilih jenjang sekolah')
      return
    }

    setRequestSubmitting(true)
    try {
      await api.post('/school-requests', {
        name: requestName.trim(),
        level: requestLevel,
      })
      toast.success('Permintaan sekolah berhasil dikirim! Tunggu persetujuan admin, lalu kembali ke halaman ini untuk membuat tim.')
      setRequestMode(false)
      setRequestName('')
      setRequestLevel('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim permintaan'
      toast.error(msg)
    } finally {
      setRequestSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-10 w-64 bg-stone-200 dark:bg-zinc-700" />
        <Skeleton className="mt-4 h-64 w-full bg-stone-200 dark:bg-zinc-700" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Buat Tim Baru"
        description="Daftarkan tim baru untuk mengikuti turnamen"
        breadcrumbs={[
          { label: 'Tim Saya', href: '/dashboard/teams' },
          { label: 'Buat Tim' },
        ]}
      />

      <ProfileCompletionGate from="team-create">
      <div className="mx-auto max-w-lg">
        {/* Top info banner */}
        <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 p-4 flex gap-3">
          <Info size={20} weight="fill" className="flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
            <p className="font-semibold mb-0.5">Tim kamu akan menunggu persetujuan admin setelah dibuat.</p>
            <p className="text-blue-800/90 dark:text-blue-300/90">Kamu bisa tetap tambah anggota saat status masih pending.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Section 1: Info Tim */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-zinc-700">
              <Users size={20} weight="bold" className="text-esi-red" />
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-zinc-100">
                1. Info Tim
              </h2>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">
                Nama Tim
              </label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Masukkan nama tim"
                className="min-h-[44px] bg-white dark:bg-zinc-800 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:border-esi-red"
              />
              <p className="mt-1.5 text-xs text-stone-500 dark:text-zinc-500">
                Pastikan nama tim sesuai dan tidak mengandung kata tidak pantas.
              </p>
            </div>
          </section>

          {/* Section 2: Pilih Cabang Game */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-zinc-700">
              <GameController size={20} weight="bold" className="text-esi-red" />
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-zinc-100">
                2. Pilih Cabang Game
              </h2>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">
                Cabang E-Sport
              </label>
              <Select value={selectedGameId} onValueChange={(v) => setSelectedGameId(v ?? '')}>
                <SelectTrigger className="min-h-[44px] w-full bg-white dark:bg-zinc-800 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100">
                  <SelectValue placeholder="Pilih game" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700">
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id} className="text-stone-900 dark:text-zinc-100">
                      {game.name} ({game.game_type === 'bracket' ? 'Bracket' : 'Battle Royale'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGameId && (() => {
                const game = games.find((g) => g.id === selectedGameId)
                if (!game) return null
                const required = game.min_team_members === game.max_team_members
                  ? `${game.min_team_members} pemain`
                  : `${game.min_team_members}–${game.max_team_members} pemain`
                return (
                  <div className="mt-3 rounded-xl border-2 border-esi-red/30 bg-esi-red/5 dark:bg-esi-red/10 p-4 flex gap-3">
                    <Users size={22} weight="duotone" className="flex-shrink-0 text-esi-red mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-stone-900 dark:text-zinc-100">
                        {game.name} membutuhkan {required}
                      </p>
                      <p className="mt-0.5 text-stone-600 dark:text-zinc-400">
                        Minimal {game.min_team_members}, maksimal {game.max_team_members} pemain inti
                        {game.max_substitutes > 0 ? ` + hingga ${game.max_substitutes} pemain cadangan` : ''}.
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
                        Anggota tim bisa ditambahkan setelah tim dibuat.
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </section>

          {/* Section 3: Sekolah */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-zinc-700">
              <Buildings size={20} weight="bold" className="text-esi-red" />
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-zinc-100">
                3. Sekolah
              </h2>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">
                Sekolah
              </label>
              {/* Prominent "school not listed" link ABOVE dropdown */}
              <button
                type="button"
                onClick={() => {
                  setRequestMode(true)
                  setSchoolDropdownOpen(false)
                  setSelectedSchoolId('')
                  setSelectedSchoolName('')
                }}
                className="mb-2 inline-flex items-center gap-1 text-xs sm:text-sm text-esi-red hover:text-esi-red-dark underline underline-offset-2 transition-colors"
              >
                Sekolah tidak ada di daftar? Ajukan penambahan sekolah
                <ArrowSquareOut size={14} weight="bold" />
              </button>
            <div ref={dropdownRef} className="relative">
              <div
                className="flex items-center gap-2 w-full min-h-[44px] rounded-md border bg-white dark:bg-zinc-800 border-stone-300 dark:border-zinc-700 px-3 py-2 cursor-pointer"
                onClick={() => {
                  setSchoolDropdownOpen(true)
                  setTimeout(() => searchRef.current?.focus(), 50)
                }}
              >
                <MagnifyingGlass size={16} className="text-stone-400 dark:text-zinc-500 flex-shrink-0" />
                <span className={`text-sm truncate ${selectedSchoolName ? 'text-stone-900 dark:text-zinc-100' : 'text-stone-400 dark:text-zinc-500'}`}>
                  {selectedSchoolName || 'Cari sekolah...'}
                </span>
              </div>

              {schoolDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                  <div className="p-2 border-b border-stone-100 dark:border-zinc-800">
                    <Input
                      ref={searchRef}
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder="Ketik nama sekolah..."
                      className="h-8 text-sm bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredSchools.length > 0 ? (
                      filteredSchools.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300 transition-colors"
                          onClick={() => selectSchool(school)}
                        >
                          {school.name} <span className="text-stone-400 dark:text-zinc-500">({school.level})</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-center text-sm text-stone-400 dark:text-zinc-500">
                        Tidak ditemukan
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedSchoolId && (
              <button
                type="button"
                className="mt-1 text-xs text-stone-400 dark:text-zinc-500 hover:text-esi-red transition-colors"
                onClick={() => {
                  setSelectedSchoolId('')
                  setSelectedSchoolName('')
                }}
              >
                Ganti sekolah
              </button>
            )}
            </div>
          </section>

          {/* School request form */}
          {requestMode && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Ajukan sekolah baru
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                Setelah admin menyetujui, kembali ke halaman ini untuk membuat tim.
              </p>
              <Input
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="Nama sekolah lengkap"
                className="h-9 text-sm bg-white dark:bg-zinc-800 border-amber-200 dark:border-amber-800/50"
              />
              <Select value={requestLevel} onValueChange={(v) => setRequestLevel(v ?? '')}>
                <SelectTrigger className="h-9 text-sm bg-white dark:bg-zinc-800 border-amber-200 dark:border-amber-800/50">
                  <SelectValue placeholder="Pilih jenjang" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700">
                  {SCHOOL_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value} className="text-stone-900 dark:text-zinc-100">
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRequestMode(false)
                    setRequestName('')
                    setRequestLevel('')
                  }}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={requestSubmitting}
                  onClick={handleSchoolRequest}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <PaperPlaneTilt size={14} className="mr-1" />
                  {requestSubmitting ? 'Mengirim...' : 'Kirim Permintaan'}
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!requestMode && (
            <div className="pt-2">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/teams')}
                  className="min-h-[44px] border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Batal
                </Button>
                <Button type="submit" disabled={submitting} className="min-h-[44px] flex-1 bg-esi-red hover:bg-esi-red-dark text-white font-semibold">
                  <PaperPlaneTilt size={16} className="mr-1.5" weight="fill" />
                  {submitting ? 'Mengirim...' : 'Simpan & Kirim ke Admin'}
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-stone-500 dark:text-zinc-500">
                Kamu akan diberitahu saat tim disetujui.
              </p>
            </div>
          )}
        </form>
      </div>
      </ProfileCompletionGate>
    </DashboardLayout>
  )
}
