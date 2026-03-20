'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { Buildings, GraduationCap, MagnifyingGlass, Users } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { School } from '@/types'

type LevelFilter = 'all' | 'SMP' | 'SMA' | 'SMK'

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'SMP', label: 'SMP' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMK', label: 'SMK' },
]

const LEVEL_BADGE: Record<'SMP' | 'SMA' | 'SMK', string> = {
  SMP: 'bg-blue-50 text-blue-600 border border-blue-200',
  SMA: 'bg-red-50 text-porjar-red border border-red-200',
  SMK: 'bg-orange-50 text-orange-600 border border-orange-200',
}

export default function SchoolsPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeLevel, setActiveLevel] = useState<LevelFilter>('all')
  const containerRef = useRef<HTMLDivElement>(null)

  usePageAnimation(containerRef, [loading])

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<School[]>('/schools?per_page=500')
        setSchools(data ?? [])
      } catch (err) {
        console.error('Gagal memuat daftar sekolah:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
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
        description="Daftar sekolah yang berpartisipasi dalam PORJAR Denpasar"
        breadcrumbs={[{ label: 'Sekolah' }]}
      />

      <div ref={containerRef}>
        {/* Stats Row */}
        <div className="anim-header mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-stone-900">{schools.length}</span>
            <span className="mt-0.5 text-xs text-stone-500 flex items-center gap-1">
              <Users size={12} />
              Total Sekolah
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-blue-600">{smpCount}</span>
            <span className="mt-0.5 text-xs text-blue-500 flex items-center gap-1">
              <GraduationCap size={12} />
              SMP
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-porjar-red">{smaCount}</span>
            <span className="mt-0.5 text-xs text-red-400 flex items-center gap-1">
              <GraduationCap size={12} />
              SMA
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-orange-100 bg-orange-50 px-4 py-4 shadow-sm">
            <span className="text-2xl font-bold text-orange-600">{smkCount}</span>
            <span className="mt-0.5 text-xs text-orange-500 flex items-center gap-1">
              <GraduationCap size={12} />
              SMK
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 space-y-3">
          {/* Search */}
          <div className="relative max-w-sm">
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama sekolah..."
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-colors focus:border-porjar-red focus:ring-2 focus:ring-porjar-red/20"
            />
          </div>

          {/* Level Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {LEVEL_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveLevel(f.value)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                  activeLevel === f.value
                    ? 'border-porjar-red bg-porjar-red text-white shadow-sm'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results summary */}
        {!loading && (
          <p className="mb-4 text-sm text-stone-500">
            Menampilkan{' '}
            <span className="font-semibold text-stone-700">{filtered.length}</span>{' '}
            sekolah
            {activeLevel !== 'all' && (
              <> tingkat <span className="font-semibold text-stone-700">{activeLevel}</span></>
            )}
            {search && (
              <> dengan kata kunci &ldquo;<span className="font-semibold text-stone-700">{search}</span>&rdquo;</>
            )}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-200 bg-white p-4 border-l-4 border-l-stone-200"
              >
                <Skeleton className="mb-2 h-4 w-3/4 rounded bg-stone-100" />
                <Skeleton className="mb-3 h-5 w-12 rounded-full bg-stone-100" />
                <Skeleton className="mb-1.5 h-3 w-full rounded bg-stone-100" />
                <Skeleton className="h-3 w-1/3 rounded bg-stone-100" />
              </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((school) => (
              <div
                key={school.id}
                className="anim-card rounded-xl border border-stone-200 bg-white p-4 shadow-sm border-l-4 border-l-porjar-red transition-shadow hover:shadow-md"
              >
                {/* Name + Level Badge */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-bold text-stone-900 leading-snug">{school.name}</h3>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      LEVEL_BADGE[school.level],
                    )}
                  >
                    {school.level}
                  </span>
                </div>

                {/* Address */}
                {school.address && (
                  <p className="mb-1 text-sm text-stone-500 line-clamp-2">{school.address}</p>
                )}

                {/* City */}
                <p className="text-xs text-stone-400">{school.city}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
