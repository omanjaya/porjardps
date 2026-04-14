'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import {
  Buildings,
  GraduationCap,
  MagnifyingGlass,
  Users,
  ArrowRight,
  Spinner,
  X,
  Trophy,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { School, SchoolLevel, Team } from '@/types'

type LevelFilter = 'all' | SchoolLevel

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'SD', label: 'SD' },
  { value: 'SMP', label: 'SMP' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMK', label: 'SMK' },
]

const LEVEL_BADGE: Record<SchoolLevel, string> = {
  SD: 'bg-amber-50 dark:bg-amber-950 text-amber-600 border border-amber-200 dark:border-amber-800',
  SMP: 'bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800',
  MTs: 'bg-teal-50 dark:bg-teal-950 text-teal-600 border border-teal-200 dark:border-teal-800',
  SMA: 'bg-red-50 dark:bg-red-950 text-esi-red border border-red-200 dark:border-red-800',
  SMK: 'bg-orange-50 dark:bg-orange-950 text-orange-600 border border-orange-200 dark:border-orange-800',
  MA: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border border-emerald-200 dark:border-emerald-800',
}

const LEVEL_BG: Record<SchoolLevel, string> = {
  SD: 'from-amber-500/10 to-amber-500/5',
  SMP: 'from-blue-500/10 to-blue-500/5',
  MTs: 'from-teal-500/10 to-teal-500/5',
  SMA: 'from-red-500/10 to-red-500/5',
  SMK: 'from-orange-500/10 to-orange-500/5',
  MA: 'from-emerald-500/10 to-emerald-500/5',
}

const LEVEL_ICON_BG: Record<SchoolLevel, string> = {
  SD: 'bg-amber-100 dark:bg-amber-900 text-amber-600',
  SMP: 'bg-blue-100 dark:bg-blue-900 text-blue-600',
  MTs: 'bg-teal-100 dark:bg-teal-900 text-teal-600',
  SMA: 'bg-red-100 dark:bg-red-900 text-esi-red',
  SMK: 'bg-orange-100 dark:bg-orange-900 text-orange-600',
  MA: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600',
}

function schoolFontSize(name: string): string {
  if (name.length > 40) return 'text-xs leading-snug'
  if (name.length > 28) return 'text-sm leading-snug'
  return 'text-sm leading-snug'
}

export default function SchoolsPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeLevel, setActiveLevel] = useState<LevelFilter>('all')

  // Sheet state
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTeams, setSheetTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const teamsCache = useRef<Record<string, Team[]>>({})

  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getPaginated<School[]>('/schools?per_page=500')
        setSchools(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        console.error('Gagal memuat daftar sekolah:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openSchool = useCallback(async (school: School) => {
    setSelectedSchool(school)
    setSheetOpen(true)

    if (teamsCache.current[school.id]) {
      setSheetTeams(teamsCache.current[school.id])
      return
    }

    setLoadingTeams(true)
    setSheetTeams([])
    try {
      const res = await api.getPaginated<Team[]>(`/teams?school_id=${school.id}&per_page=100`)
      const data = Array.isArray(res.data) ? res.data : []
      teamsCache.current[school.id] = data
      setSheetTeams(data)
    } catch {
      setSheetTeams([])
    } finally {
      setLoadingTeams(false)
    }
  }, [])

  const filtered = schools.filter((school) => {
    if (activeLevel !== 'all' && school.level !== activeLevel) return false
    if (search && !school.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const smpCount = schools.filter((s) => s.level === 'SMP').length
  const smaCount = schools.filter((s) => s.level === 'SMA').length
  const smkCount = schools.filter((s) => s.level === 'SMK').length

  return (
    <PublicLayout>
      <PageHeader
        title="Sekolah Peserta"
        description="Daftar sekolah yang berpartisipasi dalam ESI Denpasar"
        breadcrumbs={[{ label: 'Sekolah' }]}
        actions={
          <Link
            href="/schools/standings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-esi-red bg-esi-red px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <Trophy size={16} weight="bold" />
            Lihat Juara Umum
          </Link>
        }
      />

      <div ref={containerRef}>
        {/* Stats Row */}
        <div className="anim-header mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-stone-900 dark:text-zinc-100">{schools.length}</span>
            <span className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400 flex items-center gap-1">
              <Users size={12} />
              Total Sekolah
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-blue-600">{smpCount}</span>
            <span className="mt-0.5 text-xs text-blue-500 flex items-center gap-1">
              <GraduationCap size={12} />
              SMP
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-esi-red">{smaCount}</span>
            <span className="mt-0.5 text-xs text-red-400 flex items-center gap-1">
              <GraduationCap size={12} />
              SMA
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-orange-100 dark:border-orange-900 bg-orange-50 dark:bg-orange-950 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-orange-600">{smkCount}</span>
            <span className="mt-0.5 text-xs text-orange-500 flex items-center gap-1">
              <GraduationCap size={12} />
              SMK
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 space-y-3">
          <div className="relative max-w-sm">
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama sekolah..."
              className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 outline-none transition-colors focus:border-esi-red focus:ring-2 focus:ring-esi-red/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {LEVEL_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveLevel(f.value)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                  activeLevel === f.value
                    ? 'border-esi-red bg-esi-red text-white shadow-sm'
                    : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:bg-zinc-800/50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
            Menampilkan{' '}
            <span className="font-semibold text-stone-700 dark:text-zinc-300">{filtered.length}</span>{' '}
            sekolah
            {activeLevel !== 'all' && (
              <> tingkat <span className="font-semibold text-stone-700 dark:text-zinc-300">{activeLevel}</span></>
            )}
            {search && (
              <> dengan kata kunci &ldquo;<span className="font-semibold text-stone-700 dark:text-zinc-300">{search}</span>&rdquo;</>
            )}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-stone-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Buildings}
            title="Belum Ada Sekolah"
            description={
              search || activeLevel !== 'all'
                ? 'Tidak ada sekolah yang cocok dengan filter yang dipilih.'
                : 'Daftar sekolah peserta akan ditampilkan di sini.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((school) => (
              <button
                key={school.id}
                onClick={() => openSchool(school)}
                className={cn(
                  'anim-card group relative flex flex-col items-start rounded-xl border border-stone-200 dark:border-zinc-700',
                  'bg-white dark:bg-zinc-900 p-4 text-left shadow-sm',
                  'hover:shadow-md hover:border-stone-300 dark:hover:border-zinc-600 transition-all duration-200',
                  'overflow-hidden',
                )}
              >
                {/* Gradient bg accent */}
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                    LEVEL_BG[school.level],
                  )}
                />

                <div className="relative w-full">
                  {/* Icon + badge row */}
                  <div className="mb-3 flex items-center justify-between">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={school.name}
                        className="h-8 w-8 rounded-lg object-contain"
                      />
                    ) : (
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', LEVEL_ICON_BG[school.level])}>
                        <GraduationCap size={16} weight="bold" />
                      </div>
                    )}
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide', LEVEL_BADGE[school.level])}>
                      {school.level}
                    </span>
                  </div>

                  {/* School name */}
                  <p className={cn('font-semibold text-stone-900 dark:text-zinc-100 break-words', schoolFontSize(school.name))}>
                    {school.name}
                  </p>

                  {/* City */}
                  <p className="mt-1.5 text-[10px] text-stone-400 dark:text-zinc-500">{school.city}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* School detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 p-0 flex flex-col"
        >
          {selectedSchool && (
            <>
              {/* Sheet header with gradient */}
              <div
                className={cn(
                  'relative px-6 pt-10 pb-5 bg-gradient-to-br',
                  LEVEL_BG[selectedSchool.level],
                  'border-b border-stone-100 dark:border-zinc-700',
                )}
              >
                <div className="mb-3 flex items-center gap-3">
                  {selectedSchool.logo_url ? (
                    <img
                      src={selectedSchool.logo_url}
                      alt={selectedSchool.name}
                      className="h-10 w-10 rounded-xl object-contain shadow-sm bg-white dark:bg-zinc-900 p-1 border border-stone-100 dark:border-zinc-700"
                    />
                  ) : (
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-sm', LEVEL_ICON_BG[selectedSchool.level])}>
                      <GraduationCap size={20} weight="bold" />
                    </div>
                  )}
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold', LEVEL_BADGE[selectedSchool.level])}>
                    {selectedSchool.level}
                  </span>
                </div>
                <SheetTitle className="text-lg font-bold text-stone-900 dark:text-zinc-100 leading-snug pr-6">
                  {selectedSchool.name}
                </SheetTitle>
                {selectedSchool.address && (
                  <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">{selectedSchool.address}</p>
                )}
                <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">{selectedSchool.city}</p>
              </div>

              {/* Teams list */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {loadingTeams ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl bg-stone-100 dark:bg-zinc-800" />
                    ))}
                  </div>
                ) : sheetTeams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users size={32} className="mb-3 text-stone-300 dark:text-zinc-600" />
                    <p className="text-sm text-stone-400 dark:text-zinc-500">Belum ada tim terdaftar</p>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                      Tim Terdaftar ({sheetTeams.length})
                    </p>
                    <div className="space-y-2">
                      {sheetTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => {
                            setSheetOpen(false)
                            router.push(`/teams/${team.id}`)
                          }}
                          className="group w-full flex items-center gap-3 rounded-xl border border-stone-100 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 transition-colors"
                        >
                          {/* Game color dot */}
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-600 text-[10px] font-bold text-stone-500 dark:text-zinc-400">
                            {team.game?.name?.slice(0, 2).toUpperCase() ?? '—'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate">{team.name}</p>
                            <p className="text-[11px] text-stone-400 dark:text-zinc-500">
                              {team.game?.name ?? '-'} · {team.member_count} anggota
                            </p>
                          </div>
                          <ArrowRight
                            size={16}
                            className="shrink-0 text-stone-300 dark:text-zinc-600 group-hover:text-esi-red transition-colors"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PublicLayout>
  )
}
