'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Medal,
  Trophy,
  Sword,
  Users,
  Lightning,
  WarningCircle,
  FunnelSimple,
} from '@phosphor-icons/react'
import { api, getAccessToken } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { AchievementBadge } from '@/components/modules/player/AchievementBadge'
import type { Achievement, UserAchievement, AchievementCategory } from '@/types'
import { usePageAnimation } from '@/hooks/usePageAnimation'

const categoryFilters: { value: AchievementCategory | 'all'; label: string; icon: typeof Medal }[] = [
  { value: 'all', label: 'Semua', icon: Medal },
  { value: 'tournament', label: 'Turnamen', icon: Trophy },
  { value: 'match', label: 'Pertandingan', icon: Sword },
  { value: 'social', label: 'Sosial', icon: Users },
  { value: 'special', label: 'Spesial', icon: Lightning },
]

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Achievement[]>('/achievements')
        setAchievements(data ?? [])

        // If logged in, try to fetch user achievements
        if (getAccessToken()) {
          try {
            const meData = await api.get<{ id: string }>('/auth/me')
            if (meData?.id) {
              const userAch = await api.get<UserAchievement[]>(`/players/${meData.id}/achievements`)
              setUserAchievements(userAch ?? [])
            }
          } catch (err) {
            console.error('Gagal memuat pencapaian user:', err)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data pencapaian')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const earnedIds = new Set(userAchievements.map((ua) => ua.achievement_id))
  const earnedMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua.earned_at]))

  const filtered =
    activeCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === activeCategory)

  usePageAnimation(containerRef, [loading, filtered.length])

  if (loading) {
    return (
      <PublicLayout>
        <PageHeader title="Pencapaian" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl bg-stone-200" />
          ))}
        </div>
      </PublicLayout>
    )
  }

  if (error) {
    return (
      <PublicLayout>
        <EmptyState
          icon={WarningCircle}
          title="Terjadi Kesalahan"
          description={error}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Pencapaian"
        breadcrumbs={[{ label: 'Pencapaian' }]}
      />

      <div ref={containerRef}>
      {/* Category Filters */}
      <div className="anim-fade mb-6 flex gap-2 overflow-x-auto pb-1">
        {categoryFilters.map((cat) => {
          const isActive = activeCategory === cat.value
          const IconComp = cat.icon
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-porjar-red bg-porjar-red/10 text-porjar-red'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
              }`}
            >
              <IconComp size={16} weight={isActive ? 'fill' : 'regular'} />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Achievements Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Belum Ada Pencapaian"
          description="Tidak ada pencapaian untuk kategori ini."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((achievement) => (
            <div key={achievement.id} className="anim-card">
              <AchievementBadge
                achievement={achievement}
                earned={earnedIds.has(achievement.id)}
                earnedAt={earnedMap.get(achievement.id)}
              />
            </div>
          ))}
        </div>
      )}
      </div>
    </PublicLayout>
  )
}
