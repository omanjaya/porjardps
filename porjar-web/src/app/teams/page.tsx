'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users, Shield, CaretLeft, CaretRight, MagnifyingGlass,
  Crown, List as ListIcon, SquaresFour, Buildings,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import type { Team, Game, GameSlug, PaginationMeta } from '@/types'

interface School { id: string; name: string; level: string }

// Inline to avoid Turbopack HMR module-resolution race
function resolveMedia(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/uploads/')) {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9090/api/v1').replace(/\/api\/v1$/, '')
    return `${base}${path}`
  }
  return path
}

// Generate initials + consistent color from team name
const TEAM_COLORS = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
  'bg-rose-100 text-rose-700',
]
function getTeamInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
function getTeamColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return TEAM_COLORS[hash % TEAM_COLORS.length]
}

const defaultGames: { slug: GameSlug; name: string }[] = [
  { slug: 'hok', name: 'Honor of Kings' },
  { slug: 'ml', name: 'Mobile Legends' },
  { slug: 'ff', name: 'Free Fire' },
  { slug: 'pubgm', name: 'PUBG Mobile' },
  { slug: 'efootball', name: 'eFootball' },
]

function useDebounce(value: string, delay: number) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

function getUrlParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export default function TeamsDirectoryPage() {
  const [activeGame, setActiveGameState] = useState<GameSlug | null>(null)
  const [activeSchool, setActiveSchoolState] = useState<string | null>(null)
  const [page, setPageState] = useState(1)
  const [view, setViewState] = useState<'list' | 'grid'>('list')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)

  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<{ slug: GameSlug; name: string }[]>(defaultGames)
  const [schools, setSchools] = useState<School[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)

  // Initialize from URL on mount
  useEffect(() => {
    const p = getUrlParams()
    setActiveGameState((p.get('game') as GameSlug) || null)
    setActiveSchoolState(p.get('school') || null)
    setPageState(parseInt(p.get('page') || '1', 10))
    setViewState((p.get('view') as 'list' | 'grid') || 'list')
    setSearchInput(p.get('q') || '')
    setReady(true)
  }, [])

  // Sync back/forward navigation
  useEffect(() => {
    const onPop = () => {
      const p = getUrlParams()
      setActiveGameState((p.get('game') as GameSlug) || null)
      setActiveSchoolState(p.get('school') || null)
      setPageState(parseInt(p.get('page') || '1', 10))
      setViewState((p.get('view') as 'list' | 'grid') || 'list')
      setSearchInput(p.get('q') || '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const pushParams = useCallback((updates: Record<string, string | null>) => {
    const p = getUrlParams()
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '') p.delete(k)
      else p.set(k, v)
    })
    window.history.pushState(null, '', `?${p.toString()}`)
  }, [])

  const setActiveGame = (g: GameSlug | null) => { setActiveGameState(g); setPageState(1); pushParams({ game: g, page: null }) }
  const setActiveSchool = (s: string | null) => { setActiveSchoolState(s); setPageState(1); pushParams({ school: s, page: null }) }
  const setPage = (p: number) => { setPageState(p); pushParams({ page: p === 1 ? null : String(p) }) }
  const setView = (v: 'list' | 'grid') => { setViewState(v); pushParams({ view: v === 'list' ? null : v }) }

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeGame) params.set('game_slug', activeGame)
      if (activeSchool) params.set('school_id', activeSchool)
      if (search.trim()) params.set('search', search.trim())
      params.set('page', String(page))
      params.set('per_page', '24')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/teams?${params}`,
        { credentials: 'include' }
      )
      const body = await res.json()
      if (body.success) { setTeams(body.data ?? []); setMeta(body.meta ?? null) }
    } catch {} finally { setLoading(false) }
  }, [activeGame, activeSchool, search, page])


  useEffect(() => {
    api.get<Game[]>('/games').then(g => {
      if (g) setGames(g.filter(x => x.is_active).map(x => ({ slug: x.slug, name: x.name })))
    }).catch(() => {})
    api.get<School[]>('/schools?per_page=100').then(s => {
      if (s) setSchools(s.sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(() => {})
  }, [])

  // Sync search input → URL (debounced)
  const isFirstSearch = useRef(true)
  useEffect(() => {
    if (isFirstSearch.current) { isFirstSearch.current = false; return }
    setPageState(1)
    pushParams({ q: search || null, page: null })
  }, [search])

  useEffect(() => { if (ready) fetchTeams() }, [fetchTeams, ready])

  return (
    <PublicLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Tim Peserta</h1>
        <p className="mt-1 text-sm text-stone-500">
          {meta ? `${meta.total} tim terdaftar` : 'Memuat...'}
          {activeGame && ` · ${games.find(g => g.slug === activeGame)?.name ?? ''}`}
          {activeSchool && ` · ${schools.find(s => s.id === activeSchool)?.name ?? ''}`}
        </p>
      </div>

      {/* Filters bar */}
      <div className="mb-5 space-y-3">
        {/* Row 1: Game pills + search + view toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Game pills — horizontal scroll on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => setActiveGame(null)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                !activeGame
                  ? 'border-porjar-red bg-porjar-red text-white'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              )}
            >
              Semua
            </button>
            {games.map(g => {
              const cfg = GAME_CONFIG[g.slug]
              const active = activeGame === g.slug
              return (
                <button
                  key={g.slug}
                  onClick={() => setActiveGame(active ? null : g.slug)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                    active
                      ? 'border-porjar-red bg-porjar-red text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  )}
                >
                  {cfg?.logo && <img src={cfg.logo} alt="" className="h-3.5 w-3.5 object-contain" />}
                  {g.name}
                </button>
              )
            })}
          </div>

          {/* Search + view toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Cari tim..."
                className="w-full sm:w-48 rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-porjar-red/40 focus:ring-1 focus:ring-porjar-red/10"
              />
            </div>
            <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
              <button
                onClick={() => setView('list')}
                className={cn('rounded-md p-1.5 transition-colors', view === 'list' ? 'bg-porjar-red text-white' : 'text-stone-400 hover:text-stone-700')}
              >
                <ListIcon size={16} />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn('rounded-md p-1.5 transition-colors', view === 'grid' ? 'bg-porjar-red text-white' : 'text-stone-400 hover:text-stone-700')}
              >
                <SquaresFour size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: School dropdown */}
        {schools.length > 0 && (
          <div className="relative w-full max-w-xs">
            <select
              value={activeSchool ?? ''}
              onChange={e => setActiveSchool(e.target.value || null)}
              className={cn(
                'w-full appearance-none rounded-lg border py-2 pl-3 pr-8 text-sm outline-none transition',
                activeSchool
                  ? 'border-porjar-red bg-porjar-red/5 font-semibold text-porjar-red'
                  : 'border-stone-200 bg-white text-stone-600'
              )}
            >
              <option value="">Semua Sekolah</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L1 3h10L6 8z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        view === 'list' ? (
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="hidden sm:grid grid-cols-[3fr_2fr_1fr_1fr_80px] gap-3 border-b border-stone-100 bg-stone-50 px-4 py-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-3 rounded bg-stone-200" />)}
            </div>
            <div className="divide-y divide-stone-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 sm:grid sm:grid-cols-[3fr_2fr_1fr_1fr_80px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-stone-100" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-28 rounded bg-stone-100" />
                      <Skeleton className="h-2.5 w-20 rounded bg-stone-100" />
                    </div>
                  </div>
                  <Skeleton className="hidden sm:block h-3 w-24 rounded bg-stone-100" />
                  <Skeleton className="hidden sm:block h-3 w-16 rounded bg-stone-100" />
                  <Skeleton className="hidden sm:block h-3 w-8 rounded bg-stone-100 mx-auto" />
                  <Skeleton className="hidden sm:block h-5 w-12 rounded-full bg-stone-100 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-xl bg-stone-100" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-4 w-32 rounded bg-stone-100" />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3 w-3 rounded bg-stone-100" />
                      <Skeleton className="h-3 w-24 rounded bg-stone-100" />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Skeleton className="h-3 w-16 rounded bg-stone-100" />
                      <Skeleton className="h-3 w-10 rounded bg-stone-100" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-20 text-center">
          <Shield size={40} weight="thin" className="mb-2 text-stone-300" />
          <p className="text-sm font-medium text-stone-600">
            {search || activeGame ? 'Tidak ada tim yang cocok' : 'Belum ada tim terdaftar'}
          </p>
        </div>
      ) : view === 'list' ? (
        /* ═══ LIST VIEW ═══ */
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[3fr_2fr_1fr_1fr_80px] gap-3 border-b border-stone-100 bg-stone-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            <span>Tim</span>
            <span>Sekolah</span>
            <span>Game</span>
            <span className="text-center">Anggota</span>
            <span className="text-center">Status</span>
          </div>
          <div className="divide-y divide-stone-50">
            {teams.map(team => {
              const slug = team.game?.slug as GameSlug | undefined
              const cfg = slug ? GAME_CONFIG[slug] : null
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50 sm:grid sm:grid-cols-[3fr_2fr_1fr_1fr_80px]"
                >
                  {/* Team */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar — logo → school badge → initials */}
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border overflow-hidden',
                      !team.logo_url && !team.school?.logo_url
                        ? `${getTeamColor(team.name)} border-transparent`
                        : 'bg-stone-50 border-stone-100'
                    )}>
                      {team.logo_url ? (
                        <Image src={resolveMedia(team.logo_url)!} alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
                      ) : team.school?.logo_url ? (
                        <Image src={resolveMedia(team.school.logo_url)!} alt="" width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                      ) : (
                        <span className="text-xs font-bold leading-none">{getTeamInitials(team.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{team.name}</p>
                      {team.captain && (
                        <p className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Crown size={10} weight="fill" className="text-amber-400" />
                          {team.captain.full_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* School */}
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                    <Buildings size={12} className="shrink-0 text-stone-400" />
                    <p className="text-xs text-stone-500 truncate">
                      {team.school?.name ?? '-'}
                    </p>
                  </div>

                  {/* Game */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    {cfg?.logo && <img src={cfg.logo} alt="" className="h-4 w-4 object-contain" />}
                    <span className="text-xs font-medium text-stone-600">{team.game?.name}</span>
                  </div>

                  {/* Members */}
                  <div className="hidden sm:flex items-center justify-center">
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <Users size={12} />
                      {team.member_count}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden sm:flex justify-center">
                    {team.status === 'approved' || team.status === 'active' ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Aktif</span>
                    ) : team.status === 'eliminated' ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-400">Eliminasi</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Pending</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        /* ═══ GRID VIEW ═══ */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => {
            const slug = team.game?.slug as GameSlug | undefined
            const cfg = slug ? GAME_CONFIG[slug] : null
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="group rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-porjar-red/30"
              >
                <div className="flex items-start gap-3">
                  {/* Logo — logo → school badge → colored initials */}
                  <div className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border overflow-hidden',
                    team.logo_url || team.school?.logo_url
                      ? cfg ? `${cfg.bgColor} border-transparent` : 'bg-stone-50 border-stone-100'
                      : `${getTeamColor(team.name)} border-transparent`
                  )}>
                    {team.logo_url ? (
                      <Image src={resolveMedia(team.logo_url)!} alt="" width={48} height={48} className="h-12 w-12 object-contain" unoptimized />
                    ) : team.school?.logo_url ? (
                      <Image src={resolveMedia(team.school.logo_url)!} alt="" width={40} height={40} className="h-10 w-10 object-contain" unoptimized />
                    ) : (
                      <span className="text-base font-bold leading-none">{getTeamInitials(team.name)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-stone-900 truncate group-hover:text-porjar-red transition-colors">
                      {team.name}
                    </h3>
                    {team.school && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500 truncate">
                        <Buildings size={11} className="shrink-0 text-stone-400" />
                        <span className="truncate">{team.school.name}</span>
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-400">
                      {cfg && (
                        <span className="flex items-center gap-1">
                          <img src={cfg.logo} alt="" className="h-3.5 w-3.5 object-contain" />
                          <span className="font-medium">{team.game?.name}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {team.member_count}
                      </span>
                      {team.captain && (
                        <span className="flex items-center gap-1">
                          <Crown size={10} weight="fill" className="text-amber-400" />
                          <span className="truncate max-w-[60px]">{team.captain.full_name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {team.status === 'approved' || team.status === 'active' ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Aktif</span>
                    ) : team.status === 'eliminated' ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-400">Eliminasi</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CaretLeft size={12} /> Sebelumnya
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(meta.total_pages, 5) }, (_, i) => {
              const p = meta.total_pages <= 5 ? i + 1
                : page <= 3 ? i + 1
                : page >= meta.total_pages - 2 ? meta.total_pages - 4 + i
                : page - 2 + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all',
                    p === page ? 'bg-porjar-red text-white' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            disabled={page >= meta.total_pages}
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Berikutnya <CaretRight size={12} />
          </button>
        </div>
      )}
    </PublicLayout>
  )
}
