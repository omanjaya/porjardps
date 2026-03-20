'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  UserCircle,
  Trophy,
  Star,
  Sword,
  GameController,
  Target,
  Lightning,
  SoccerBall,
  WarningCircle,
  Medal,
  ChartBar,
  Crosshair,
} from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { AchievementBadge } from '@/components/modules/player/AchievementBadge'
import { GAME_CONFIG } from '@/constants/games'
import type { PlayerProfile, GameSlug, GameStatsItem } from '@/types'
import type { Icon } from '@phosphor-icons/react'

const gameIcons: Record<GameSlug, Icon> = {
  hok: Sword,
  ml: GameController,
  ff: Target,
  pubgm: Lightning,
  efootball: SoccerBall,
}

const roleBadge: Record<string, { label: string; color: string }> = {
  player: { label: 'Player', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  admin: { label: 'Admin', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  superadmin: { label: 'Super Admin', color: 'bg-red-50 text-red-600 border-red-200' },
}

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGameTab, setActiveGameTab] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<PlayerProfile>(`/players/${params.id}`)
        setProfile(data)
        if (data.game_stats?.length > 0) {
          setActiveGameTab(data.game_stats[0].game.slug)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat profil pemain')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <PublicLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl bg-stone-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-stone-200" />
            ))}
          </div>
          <Skeleton className="h-60 rounded-xl bg-stone-200" />
        </div>
      </PublicLayout>
    )
  }

  if (error || !profile) {
    return (
      <PublicLayout>
        <EmptyState
          icon={WarningCircle}
          title={error ? 'Terjadi Kesalahan' : 'Pemain Tidak Ditemukan'}
          description={error ?? 'Pemain yang kamu cari tidak ada.'}
        />
      </PublicLayout>
    )
  }

  const { user } = profile
  const role = roleBadge[user.role] ?? roleBadge.player
  const activeStats: GameStatsItem | undefined = profile.game_stats?.find(
    (gs) => gs.game.slug === activeGameTab
  )

  return (
    <PublicLayout>
      <PageHeader
        title=""
        breadcrumbs={[
          { label: 'Pemain', href: '/players' },
          { label: user.full_name },
        ]}
      />

      {/* Hero Section */}
      <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-100 to-stone-200 ring-2 ring-stone-300">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-stone-500">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold text-stone-900">{user.full_name}</h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${role.color}`}
              >
                {role.label}
              </span>
            </div>
            <p className="text-sm text-stone-500">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={ChartBar}
          label="Total Pertandingan"
          value={profile.total_matches}
          color="text-blue-500"
        />
        <StatCard
          icon={Trophy}
          label="Win Rate"
          value={`${profile.win_rate.toFixed(1)}%`}
          color="text-green-500"
        />
        <StatCard
          icon={Star}
          label="MVP"
          value={profile.total_mvp}
          color="text-amber-500"
        />
        <StatCard
          icon={GameController}
          label="Game Dimainkan"
          value={profile.games_played}
          color="text-purple-500"
        />
      </div>

      {/* Per-Game Stats Tabs */}
      {profile.game_stats && profile.game_stats.length > 0 && (
        <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
            <ChartBar size={20} weight="bold" />
            Statistik Per Game
          </h2>

          {/* Game Tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {profile.game_stats.map((gs) => {
              const slug = gs.game.slug as GameSlug
              const config = GAME_CONFIG[slug]
              const GameIcon = gameIcons[slug] ?? GameController
              const isActive = activeGameTab === slug
              return (
                <button
                  key={slug}
                  onClick={() => setActiveGameTab(slug)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? `${config?.bgColor ?? 'bg-stone-100'} ${config?.color ?? 'text-stone-900'} ${config?.borderColor ?? 'border-stone-300'}`
                      : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                  }`}
                >
                  <GameIcon size={16} weight={isActive ? 'fill' : 'regular'} />
                  {gs.game.name}
                </button>
              )
            })}
          </div>

          {/* Active Game Stats */}
          {activeStats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Menang" value={activeStats.wins} />
              <MiniStat label="Kalah" value={activeStats.losses} />
              <MiniStat label="Win Rate" value={`${activeStats.win_rate.toFixed(1)}%`} />
              <MiniStat label="MVP" value={activeStats.mvp_count} />
              <MiniStat label="Total Kills" value={activeStats.total_kills} />
              <MiniStat label="Total Deaths" value={activeStats.total_deaths} />
              <MiniStat label="Total Assists" value={activeStats.total_assists} />
              <MiniStat
                label="KDA"
                value={
                  activeStats.total_deaths > 0
                    ? ((activeStats.total_kills + activeStats.total_assists) / activeStats.total_deaths).toFixed(2)
                    : (activeStats.total_kills + activeStats.total_assists).toString()
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Achievement Showcase */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
          <Medal size={20} weight="bold" />
          Pencapaian
        </h2>

        {!profile.achievements || profile.achievements.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Medal size={36} weight="thin" className="mb-2 text-stone-300" />
            <p className="text-sm text-stone-500">Belum ada pencapaian</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {profile.achievements.map((ua) => (
              <AchievementBadge
                key={ua.id}
                achievement={ua.achievement}
                earned
                earnedAt={ua.earned_at}
              />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}

function StatCard({
  icon: IconComp,
  label,
  value,
  color,
}: {
  icon: Icon
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <IconComp size={18} weight="bold" className={color} />
        <span className="text-xs font-medium text-stone-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-porjar-bg px-3 py-2">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-lg font-semibold text-stone-900">{value}</p>
    </div>
  )
}
