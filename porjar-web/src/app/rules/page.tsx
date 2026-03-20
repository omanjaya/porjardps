'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { usePageAnimation } from '@/hooks/usePageAnimation'
import { CaretDown, MapPin, CalendarBlank, GraduationCap, SpinnerGap } from '@phosphor-icons/react'
import type { GameSlug } from '@/types'

/* ------------------------------------------------------------------ */
/*  Accordion primitive                                                */
/* ------------------------------------------------------------------ */
function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-semibold text-stone-800 bg-white hover:bg-stone-50 transition-colors"
      >
        <span>{title}</span>
        <CaretDown
          size={18}
          className={cn('shrink-0 text-stone-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="border-t border-stone-200 bg-white px-4 py-4">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm text-stone-700 leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface GameRule {
  id: string
  game_id: string
  section_name: string
  section_order: number
  content: string
  is_published: boolean
  updated_at: string
}

const GAME_TABS: { slug: GameSlug; label: string }[] = [
  { slug: 'ml', label: 'MLBB' },
  { slug: 'hok', label: 'HOK' },
  { slug: 'ff', label: 'Free Fire' },
  { slug: 'pubgm', label: 'PUBG Mobile' },
  { slug: 'efootball', label: 'eFootball' },
]

const GAME_DATES: Record<GameSlug, string> = {
  ml: '29 Maret 2026',
  hok: '29 Maret 2026',
  ff: '29-30 Maret 2026',
  pubgm: '30-31 Maret 2026',
  efootball: '29-31 Maret 2026',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RulesPage() {
  const [activeGame, setActiveGame] = useState<GameSlug>('ml')
  const [rules, setRules] = useState<GameRule[]>([])
  const [loading, setLoading] = useState(false)
  const config = GAME_CONFIG[activeGame]
  const containerRef = useRef<HTMLDivElement>(null)
  usePageAnimation(containerRef, [loading, rules.length])

  const fetchRules = useCallback(async (slug: GameSlug) => {
    setLoading(true)
    try {
      const data = await api.get<GameRule[]>(`/games/${slug}/rules`)
      setRules(data ?? [])
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules(activeGame)
  }, [activeGame, fetchRules])

  return (
    <PublicLayout>
      <div ref={containerRef}>
      <PageHeader
        title="Peraturan Turnamen"
        description="Peraturan resmi setiap cabang e-sport PORJAR Denpasar 2026"
      />

      {/* Info Umum Card */}
      <section className="anim-section mb-8 rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Info Umum</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-porjar-red/10">
              <MapPin size={20} className="text-porjar-red" weight="fill" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Lokasi</p>
              <p className="text-sm font-semibold text-stone-800">Graha Yowana Suci</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-porjar-red/10">
              <CalendarBlank size={20} className="text-porjar-red" weight="fill" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tanggal</p>
              <p className="text-sm font-semibold text-stone-800">29 - 31 Maret 2026</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-porjar-red/10">
              <GraduationCap size={20} className="text-porjar-red" weight="fill" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Tingkat</p>
              <p className="text-sm font-semibold text-stone-800">SMA / SMK</p>
            </div>
          </div>
        </div>
      </section>

      {/* Game Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {GAME_TABS.map((game) => {
          const gc = GAME_CONFIG[game.slug]
          const isActive = activeGame === game.slug
          return (
            <button
              key={game.slug}
              onClick={() => setActiveGame(game.slug)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-semibold transition-colors',
                isActive
                  ? 'border-porjar-red bg-porjar-red text-white shadow-sm'
                  : 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  isActive ? 'bg-white/20' : 'bg-stone-100'
                )}
              >
                <img
                  src={gc.logo}
                  alt={game.label}
                  className="h-5 w-5 rounded object-contain"
                />
              </span>
              {game.label}
            </button>
          )
        })}
      </div>

      {/* Game title + date badge */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-stone-900">{config.name}</h2>
        <span className="rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600">
          {GAME_DATES[activeGame]}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <SpinnerGap size={32} className="animate-spin text-stone-400" />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-stone-500">Aturan belum dipublikasi</p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {rules.map((rule, i) => (
            <div key={rule.id} className="anim-list-item">
              <Accordion title={rule.section_name} defaultOpen={i === 0}>
                <RuleList
                  items={rule.content
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)}
                />
              </Accordion>
            </div>
          ))}
        </div>
      )}
      </div>
    </PublicLayout>
  )
}
