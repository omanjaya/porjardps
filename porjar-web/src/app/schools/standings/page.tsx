'use client'

import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'
import { api, resolveMediaUrl } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Trophy, GraduationCap, Medal, Crown, Star, CaretRight, Sparkle } from '@phosphor-icons/react'
import { CornerMarks, RedDivider } from '@/components/landing/PorjarOrnaments'
import { cn } from '@/lib/utils'
import type { SchoolStanding, SchoolLevel, TournamentMedals } from '@/types'

gsap.registerPlugin(ScrollTrigger)

type LevelFilter = 'all' | SchoolLevel

const RED = 'var(--primary)'

// Floating particle positions (pre-computed to avoid layout shift)
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  left: `${8 + (i * 7.5) % 84}%`,
  delay: `${i * 0.4}s`,
  duration: `${3 + (i % 3)}s`,
  size: i % 3 === 0 ? 3 : 2,
}))

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

const RANK_GRADIENT = [
  'from-amber-400/20 via-amber-300/5 to-transparent',
  'from-stone-300/20 via-stone-200/5 to-transparent dark:from-zinc-500/20 dark:via-zinc-600/5',
  'from-amber-700/15 via-amber-600/5 to-transparent',
]

function MedalDot({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'
  const colors = [
    'bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-400/40',
    'bg-gradient-to-br from-stone-200 to-stone-400 shadow-stone-300/40 dark:from-zinc-400 dark:to-zinc-500',
    'bg-gradient-to-br from-amber-600 to-amber-800 shadow-amber-700/40',
  ]
  return <span className={cn('inline-block rounded-full shadow-sm', s, colors[rank - 1])} />
}

export default function SchoolStandingsPage() {
  const [standings, setStandings] = useState<SchoolStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLevel, setActiveLevel] = useState<LevelFilter>('all')
  const [selectedSchool, setSelectedSchool] = useState<SchoolStanding | null>(null)
  const [schoolMedals, setSchoolMedals] = useState<TournamentMedals[]>([])
  const [medalsLoading, setMedalsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // GSAP animations
  useEffect(() => {
    if (loading) return
    const ctx = gsap.context(() => {
      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo('.hero-icon', { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: 0.8 })
        .fromTo('.hero-title', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
        .fromTo('.hero-subtitle', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
        .fromTo('.hero-stat', { y: 20, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08 }, '-=0.2')
        .fromTo('.filter-btn', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 }, '-=0.3')

      // Podium animation for top 3
      gsap.fromTo('.podium-card', { y: 60, opacity: 0, scale: 0.9 }, {
        y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '.podium-section', start: 'top 85%' },
      })

      // Table rows stagger
      gsap.fromTo('.standing-row', { x: -20, opacity: 0 }, {
        x: 0, opacity: 1, duration: 0.4, stagger: 0.04,
        scrollTrigger: { trigger: tableRef.current, start: 'top 85%' },
      })
    }, containerRef)
    return () => ctx.revert()
  }, [loading, activeLevel])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const endpoint = activeLevel === 'all' ? '/school-standings' : `/school-standings?level=${activeLevel}`
        const res = await api.get<SchoolStanding[]>(endpoint)
        setStandings(Array.isArray(res) ? res : [])
      } catch {
        setStandings([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeLevel])

  async function handleSchoolClick(school: SchoolStanding) {
    setSelectedSchool(school)
    setMedalsLoading(true)
    try {
      const allMedals = await api.get<TournamentMedals[]>('/medal-standings')
      const filtered = allMedals
        .map(tm => ({ ...tm, medals: tm.medals.filter(m => m.school_id === school.id) }))
        .filter(tm => tm.medals.length > 0)
      setSchoolMedals(filtered)
    } catch {
      setSchoolMedals([])
    } finally {
      setMedalsLoading(false)
    }
  }

  const top3 = standings.slice(0, 3)
  const rest = standings.slice(3)
  const totalGold = standings.reduce((a, s) => a + s.gold, 0)
  const totalSilver = standings.reduce((a, s) => a + s.silver, 0)
  const totalBronze = standings.reduce((a, s) => a + s.bronze, 0)

  return (
    <PublicLayout>
      <div ref={containerRef} className="min-h-screen">
        {/* ═══ HERO BANNER ═══ */}
        <div ref={heroRef} className="relative overflow-hidden rounded-2xl mx-1 sm:mx-0 mb-8" style={{ background: 'var(--primary)' }}>
          <CornerMarks size={28} thickness={2} color="rgba(255,255,255,0.3)" />

          {/* Background ornaments */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Diagonal panel — right */}
            <svg className="absolute right-0 top-0 h-full w-[220px] opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 220 400" fill="none">
              <polygon points="60,0 220,0 220,400 0,400" fill="white" />
            </svg>
            {/* Diagonal panel — left */}
            <svg className="absolute left-0 bottom-0 h-[60%] w-[120px] opacity-[0.05]" preserveAspectRatio="none" viewBox="0 0 120 300" fill="none">
              <polygon points="0,0 60,0 120,300 0,300" fill="white" />
            </svg>
            {/* Crosshatch lines — top right */}
            <svg className="absolute right-6 top-10 opacity-[0.07]" width="120" height="120" viewBox="0 0 120 120" fill="none">
              {[0, 16, 32, 48, 64].map((o) => (
                <line key={o} x1={o} y1="0" x2="120" y2={120 - o} stroke="white" strokeWidth="1" />
              ))}
              {[0, 16, 32, 48, 64].map((o) => (
                <line key={`b${o}`} x1="0" y1={o} x2={120 - o} y2="120" stroke="white" strokeWidth="1" />
              ))}
            </svg>
            {/* Angular bracket — bottom left */}
            <svg className="absolute bottom-8 left-6 opacity-[0.12]" width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path d="M0 60 L0 0 L60 0" stroke="white" strokeWidth="2" fill="none" strokeLinecap="square" />
              <path d="M10 60 L10 10 L60 10" stroke="white" strokeWidth="1" fill="none" strokeLinecap="square" opacity="0.5" />
            </svg>
            {/* Angular bracket — top right */}
            <svg className="absolute right-6 top-6 opacity-[0.12]" width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path d="M60 0 L60 60 L0 60" stroke="white" strokeWidth="2" fill="none" strokeLinecap="square" />
              <path d="M50 0 L50 50 L0 50" stroke="white" strokeWidth="1" fill="none" strokeLinecap="square" opacity="0.5" />
            </svg>
            {/* Diamond rule — bottom center */}
            <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-[0.1]" width="300" height="16" viewBox="0 0 300 16" fill="none">
              <line x1="0" y1="8" x2="130" y2="8" stroke="white" strokeWidth="1" />
              <rect x="143" y="2" width="14" height="14" transform="rotate(45 150 9)" fill="white" />
              <line x1="170" y1="8" x2="300" y2="8" stroke="white" strokeWidth="1" />
            </svg>
            {/* Floating particles */}
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white/20 animate-float"
                style={{
                  left: p.left,
                  bottom: '-4px',
                  width: p.size,
                  height: p.size,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 text-center text-white">
            <div className="hero-icon relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <Trophy size={32} weight="fill" className="text-amber-300" />
              <Sparkle size={12} weight="fill" className="absolute -top-1 -right-1 text-amber-300 animate-pulse" />
              <Sparkle size={10} weight="fill" className="absolute -bottom-0.5 -left-1 text-amber-200/70 animate-pulse" style={{ animationDelay: '0.5s' }} />
              <Sparkle size={8} weight="fill" className="absolute top-0 -left-2 text-white/40 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <h1 className="hero-title text-3xl sm:text-4xl font-black tracking-tight">JUARA UMUM</h1>
            <p className="hero-subtitle mt-2 text-sm sm:text-base text-white/70 max-w-md mx-auto">
              Klasemen perolehan medali sekolah dari seluruh cabang pertandingan ESI Denpasar 2026
            </p>

            {/* Summary stats */}
            {!loading && standings.length > 0 && (
              <div className="mt-6 flex justify-center gap-4 sm:gap-8">
                <div className="hero-stat flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <MedalDot rank={1} size="sm" />
                    <span className="text-2xl sm:text-3xl font-black tabular-nums text-amber-300">{totalGold}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Gold</span>
                </div>
                <div className="hero-stat flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <MedalDot rank={2} size="sm" />
                    <span className="text-2xl sm:text-3xl font-black tabular-nums text-stone-300">{totalSilver}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Silver</span>
                </div>
                <div className="hero-stat flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <MedalDot rank={3} size="sm" />
                    <span className="text-2xl sm:text-3xl font-black tabular-nums text-amber-600">{totalBronze}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Bronze</span>
                </div>
                <div className="hero-stat flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-white/90">{standings.length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Sekolah</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ FILTER TABS ═══ */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveLevel(f.value)}
              className={cn(
                'filter-btn rounded-xl border px-4 py-2 text-sm font-semibold transition-all',
                activeLevel === f.value
                  ? 'border-esi-red bg-esi-red text-white shadow-md shadow-red-500/20 scale-105'
                  : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:bg-zinc-800/50 hover:scale-[1.02]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl bg-stone-100 dark:bg-zinc-800" />)}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-stone-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : standings.length === 0 ? (
          <EmptyState icon={Trophy} title="Belum Ada Data" description="Klasemen medali sekolah akan muncul setelah turnamen selesai." />
        ) : (
          <>
            {/* ═══ PODIUM — TOP 3 ═══ */}
            {top3.length > 0 && (
              <div className="podium-section mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Reorder for desktop: 2nd, 1st, 3rd */}
                  {[top3[1], top3[0], top3[2]].filter(Boolean).map((school, visualIdx) => {
                    const actualRank = school.rank
                    const isChampion = actualRank === 1
                    return (
                      <div
                        key={school.id}
                        onClick={() => handleSchoolClick(school)}
                        className={cn(
                          'podium-card group relative overflow-hidden rounded-2xl border cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1',
                          isChampion
                            ? 'border-amber-300/50 dark:border-amber-600/30 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-zinc-900 sm:order-none order-first'
                            : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
                        )}
                      >
                        {/* Gradient top bar */}
                        <div className={cn('h-1.5 w-full bg-gradient-to-r', RANK_GRADIENT[actualRank - 1])} />

                        {/* Shimmer overlay for champion */}
                        {isChampion && (
                          <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute -inset-full animate-shimmer bg-gradient-to-r from-transparent via-amber-200/10 to-transparent" style={{ animationDuration: '3s' }} />
                            <Sparkle size={10} weight="fill" className="absolute top-3 right-4 text-amber-400/40 animate-pulse" />
                            <Sparkle size={8} weight="fill" className="absolute bottom-8 left-3 text-amber-300/30 animate-pulse" style={{ animationDelay: '0.7s' }} />
                          </div>
                        )}

                        <div className="relative p-5 text-center">
                          {/* Rank badge */}
                          <div className={cn(
                            'mx-auto mb-3 flex items-center justify-center rounded-full',
                            isChampion ? 'h-14 w-14 ring-2 ring-amber-300/30 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : 'h-12 w-12',
                            actualRank === 1 && 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-400/30',
                            actualRank === 2 && 'bg-gradient-to-br from-stone-200 to-stone-400 shadow-lg shadow-stone-300/20 dark:from-zinc-400 dark:to-zinc-500',
                            actualRank === 3 && 'bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg shadow-amber-700/20',
                          )}>
                            {isChampion ? (
                              <Crown size={28} weight="fill" className="text-white drop-shadow-sm" />
                            ) : (
                              <span className="text-xl font-black text-white">{actualRank}</span>
                            )}
                          </div>

                          {/* School logo */}
                          {school.logo_url ? (
                            <img
                              src={resolveMediaUrl(school.logo_url) ?? ''}
                              alt={school.name}
                              className={cn('mx-auto rounded-xl object-contain', isChampion ? 'h-16 w-16 mb-3' : 'h-12 w-12 mb-2')}
                            />
                          ) : (
                            <div className={cn('mx-auto flex items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800', isChampion ? 'h-16 w-16 mb-3' : 'h-12 w-12 mb-2')}>
                              <GraduationCap size={isChampion ? 28 : 22} className="text-stone-400 dark:text-zinc-500" />
                            </div>
                          )}

                          {/* School name */}
                          <h3 className={cn('font-bold text-stone-900 dark:text-zinc-100 leading-tight', isChampion ? 'text-base' : 'text-sm')}>
                            {school.name}
                          </h3>
                          <div className="mt-1 flex items-center justify-center gap-1.5">
                            <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', LEVEL_BADGE[school.level])}>{school.level}</span>
                            <span className="text-[11px] text-stone-400 dark:text-zinc-500">{school.city}</span>
                          </div>

                          {/* Medal counts */}
                          <div className="mt-4 flex justify-center gap-4">
                            <div className="flex flex-col items-center">
                              <MedalDot rank={1} />
                              <span className="mt-1 text-lg font-black text-amber-500 tabular-nums">{school.gold}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <MedalDot rank={2} />
                              <span className="mt-1 text-lg font-black text-stone-400 dark:text-zinc-500 tabular-nums">{school.silver}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <MedalDot rank={3} />
                              <span className="mt-1 text-lg font-black text-amber-700 dark:text-amber-600 tabular-nums">{school.bronze}</span>
                            </div>
                          </div>
                        </div>

                        {/* Hover indicator */}
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-esi-red to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ DIVIDER ═══ */}
            {rest.length > 0 && (
              <div className="mb-8 flex items-center gap-3">
                <RedDivider className="flex-1" />
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 dark:text-zinc-500">
                  Klasemen Lengkap
                </span>
                <RedDivider className="flex-1" />
              </div>
            )}

            {/* ═══ REST OF STANDINGS ═══ */}
            {rest.length > 0 && (
              <div ref={tableRef} className="rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50">
                        <th className="w-16 px-4 py-3 text-left font-semibold text-stone-500 dark:text-zinc-500">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-stone-500 dark:text-zinc-500">Sekolah</th>
                        <th className="w-20 px-4 py-3 text-center"><MedalDot rank={1} /></th>
                        <th className="w-20 px-4 py-3 text-center"><MedalDot rank={2} /></th>
                        <th className="w-20 px-4 py-3 text-center"><MedalDot rank={3} /></th>
                        <th className="w-12 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((school) => (
                        <tr
                          key={school.id}
                          onClick={() => handleSchoolClick(school)}
                          className="standing-row border-b border-stone-100 dark:border-zinc-800 transition-all hover:bg-stone-50 dark:hover:bg-zinc-800/50 cursor-pointer group"
                        >
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-bold text-stone-400 dark:text-zinc-500 tabular-nums">{school.rank}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {school.logo_url ? (
                                <Image src={resolveMediaUrl(school.logo_url) ?? ''} alt={`${school.name} logo`} width={36} height={36} className="h-9 w-9 shrink-0 rounded-xl object-contain transition-transform group-hover:scale-110" unoptimized />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800">
                                  <GraduationCap size={16} className="text-stone-400 dark:text-zinc-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-900 dark:text-zinc-100 truncate group-hover:text-esi-red transition-colors">{school.name}</span>
                                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', LEVEL_BADGE[school.level])}>{school.level}</span>
                                </div>
                                <p className="text-xs text-stone-400 dark:text-zinc-500">{school.city}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center"><span className="text-base font-bold text-amber-500 tabular-nums">{school.gold}</span></td>
                          <td className="px-4 py-3.5 text-center"><span className="text-base font-bold text-stone-400 dark:text-zinc-500 tabular-nums">{school.silver}</span></td>
                          <td className="px-4 py-3.5 text-center"><span className="text-base font-bold text-amber-700 dark:text-amber-600 tabular-nums">{school.bronze}</span></td>
                          <td className="px-4 py-3.5 text-right">
                            <CaretRight size={14} className="text-stone-300 dark:text-zinc-600 group-hover:text-esi-red transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="sm:hidden divide-y divide-stone-100 dark:divide-zinc-800">
                  {rest.map((school) => (
                    <div
                      key={school.id}
                      onClick={() => handleSchoolClick(school)}
                      className="standing-row px-4 py-3.5 cursor-pointer transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800/50 active:bg-stone-100 dark:active:bg-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold text-stone-400 dark:text-zinc-500 tabular-nums">
                          {school.rank}
                        </span>
                        {school.logo_url ? (
                          <Image src={resolveMediaUrl(school.logo_url) ?? ''} alt={`${school.name} logo`} width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg object-contain" unoptimized />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-zinc-800">
                            <GraduationCap size={14} className="text-stone-400 dark:text-zinc-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate">{school.name}</span>
                            <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold', LEVEL_BADGE[school.level])}>{school.level}</span>
                          </div>
                        </div>
                        <CaretRight size={14} className="shrink-0 text-stone-300 dark:text-zinc-600" />
                      </div>
                      <div className="mt-2 ml-11 flex items-center gap-4">
                        {[1, 2, 3].map((r) => (
                          <div key={r} className="flex items-center gap-1.5">
                            <MedalDot rank={r} size="sm" />
                            <span className={cn('text-sm font-bold tabular-nums',
                              r === 1 && 'text-amber-500',
                              r === 2 && 'text-stone-400 dark:text-zinc-500',
                              r === 3 && 'text-amber-700 dark:text-amber-600',
                            )}>
                              {r === 1 ? school.gold : r === 2 ? school.silver : school.bronze}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ SCHOOL DETAIL SHEET ═══ */}
      <Sheet open={!!selectedSchool} onOpenChange={(open) => { if (!open) setSelectedSchool(null) }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {selectedSchool?.logo_url ? (
                <Image src={resolveMediaUrl(selectedSchool.logo_url) ?? ''} alt={`${selectedSchool.name} logo`} width={48} height={48} className="h-12 w-12 rounded-xl object-contain" unoptimized />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800">
                  <GraduationCap size={24} className="text-stone-400" />
                </div>
              )}
              <div>
                <div className="text-left text-base">{selectedSchool?.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedSchool && (
                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', LEVEL_BADGE[selectedSchool.level])}>{selectedSchool.level}</span>
                  )}
                  <span className="text-xs font-normal text-stone-400">{selectedSchool?.city}</span>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Medal summary */}
          {selectedSchool && (
            <div className="mt-5 flex items-center gap-5 rounded-xl bg-stone-50 dark:bg-zinc-800/80 px-5 py-4">
              {[
                { rank: 1, count: selectedSchool.gold, label: 'Gold', color: 'text-amber-500' },
                { rank: 2, count: selectedSchool.silver, label: 'Silver', color: 'text-stone-400 dark:text-zinc-500' },
                { rank: 3, count: selectedSchool.bronze, label: 'Bronze', color: 'text-amber-700' },
              ].map(({ rank, count, label, color }) => (
                <div key={rank} className="flex flex-col items-center">
                  <MedalDot rank={rank} size="md" />
                  <span className={cn('mt-1 text-xl font-black tabular-nums', color)}>{count}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">{label}</span>
                </div>
              ))}
              {selectedSchool.rank && (
                <div className="ml-auto flex flex-col items-center">
                  <Star size={16} weight="fill" className="text-esi-red" />
                  <span className="mt-1 text-xl font-black text-stone-700 dark:text-zinc-300">#{selectedSchool.rank}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">Rank</span>
                </div>
              )}
            </div>
          )}

          {/* Tournament medals breakdown */}
          <div className="mt-5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-zinc-500">Detail Per Cabang</h4>
            {medalsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : schoolMedals.length === 0 ? (
              <EmptyState
                size="sm"
                icon={Medal}
                title="Belum ada data medali"
                description="Medali dari cabang turnamen akan muncul di sini."
              />
            ) : (
              <div className="space-y-2">
                {schoolMedals.map(tm => (
                  <div key={tm.tournament_id} className="rounded-xl border border-stone-200 dark:border-zinc-700 p-3.5 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800/30">
                    <div className="text-sm font-bold text-stone-800 dark:text-zinc-200">{tm.tournament_name}</div>
                    <div className="text-[11px] text-stone-400 dark:text-zinc-500 mb-2.5">{tm.game_name}</div>
                    <div className="space-y-1.5">
                      {tm.medals.map((medal, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm">
                          <MedalDot rank={medal.rank} size="sm" />
                          <span className={cn('font-semibold min-w-[48px]',
                            medal.rank === 1 && 'text-amber-500',
                            medal.rank === 2 && 'text-stone-400 dark:text-zinc-500',
                            medal.rank === 3 && 'text-amber-700 dark:text-amber-600',
                          )}>
                            {medal.rank === 1 ? 'Gold' : medal.rank === 2 ? 'Silver' : 'Bronze'}
                          </span>
                          <span className="text-stone-600 dark:text-zinc-300 text-xs truncate">{medal.team_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PublicLayout>
  )
}
