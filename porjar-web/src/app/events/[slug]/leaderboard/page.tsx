'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { api } from '@/lib/api'
import { useEvent } from '@/contexts/EventContext'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Trophy, Users, GraduationCap, Medal, Crown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type {
  TeamLeaderboardEntry, UserLeaderboardEntry, SchoolLeaderboardEntry,
} from '@/types'

type Tab = 'teams' | 'users' | 'schools'

export default function EventLeaderboardPage() {
  const event = useEvent()
  const [tab, setTab] = useState<Tab>('teams')
  const [teamEntries, setTeamEntries] = useState<TeamLeaderboardEntry[]>([])
  const [userEntries, setUserEntries] = useState<UserLeaderboardEntry[]>([])
  const [schoolEntries, setSchoolEntries] = useState<SchoolLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teams, users, schools] = await Promise.all([
        api.getPaginated<TeamLeaderboardEntry[]>(`/leaderboards/teams?limit=50&event_id=${event.id}`),
        api.getPaginated<UserLeaderboardEntry[]>(`/leaderboards/users?limit=50&event_id=${event.id}`),
        api.getPaginated<SchoolLeaderboardEntry[]>(`/leaderboards/schools?limit=50&event_id=${event.id}`),
      ])
      setTeamEntries(teams.data ?? [])
      setUserEntries(users.data ?? [])
      setSchoolEntries(schools.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [event.id])

  useEffect(() => { loadData() }, [loadData])

  const tabs: { key: Tab; label: string; icon: typeof Trophy; count: number }[] = [
    { key: 'teams', label: 'Tim', icon: Users, count: teamEntries.length },
    { key: 'users', label: 'Pemain', icon: Medal, count: userEntries.length },
    { key: 'schools', label: 'Sekolah', icon: GraduationCap, count: schoolEntries.length },
  ]

  const rankBadge = (rank: number) => {
    if (rank === 1) return <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40"><Crown size={14} weight="fill" className="text-amber-500" /></div>
    if (rank === 2) return <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 dark:bg-zinc-800"><Trophy size={14} weight="fill" className="text-stone-400" /></div>
    if (rank === 3) return <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40"><Trophy size={14} weight="fill" className="text-amber-700" /></div>
    return <span className="flex h-7 w-7 items-center justify-center text-sm font-bold text-stone-400 dark:text-zinc-500">{rank}</span>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-esi-red/10">
            <Trophy size={22} weight="duotone" className="text-esi-red" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-zinc-100">
              Leaderboard
              {event.status === 'completed' && (
                <span className="ml-2 inline-block align-middle text-sm bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">FINAL</span>
              )}
            </h1>
            <p className="text-sm text-stone-500 dark:text-zinc-400">Peringkat poin {event.short_name || event.name}</p>
          </div>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all',
              tab === t.key
                ? 'bg-esi-red text-white shadow-sm'
                : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
            )}
          >
            <t.icon size={16} weight={tab === t.key ? 'fill' : 'regular'} />
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                tab === t.key ? 'bg-white/20' : 'bg-stone-200 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-16 rounded-xl bg-stone-100 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Teams */}
          {tab === 'teams' && (
            teamEntries.length === 0 ? (
              <EmptyState icon={Users} title="Belum ada peringkat tim" description="Peringkat tim akan muncul setelah pertandingan selesai" />
            ) : (
              <div className="space-y-2">
                {teamEntries.map((e) => (
                  <div key={e.team_id} className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 sm:p-4 transition-colors',
                    e.rank <= 3
                      ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                  )}>
                    {rankBadge(e.rank)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {e.team_logo_url && <Image src={e.team_logo_url} alt="" width={28} height={28} className="rounded-full" unoptimized />}
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-zinc-100 truncate">{e.team_name}</p>
                          <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">{e.school_name ?? '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-xl font-black text-esi-red tabular-nums">{e.total_points}</p>
                      <p className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-wider">poin</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Users */}
          {tab === 'users' && (
            userEntries.length === 0 ? (
              <EmptyState icon={Medal} title="Belum ada peringkat pemain" description="Peringkat pemain akan muncul setelah pertandingan selesai" />
            ) : (
              <div className="space-y-2">
                {userEntries.map((e) => (
                  <div key={e.user_id} className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 sm:p-4 transition-colors',
                    e.rank <= 3
                      ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                  )}>
                    {rankBadge(e.rank)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {e.avatar_url && <Image src={e.avatar_url} alt="" width={28} height={28} className="rounded-full" unoptimized />}
                        <p className="font-bold text-stone-900 dark:text-zinc-100 truncate">{e.full_name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-xl font-black text-esi-red tabular-nums">{e.total_points}</p>
                      <p className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-wider">poin</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Schools */}
          {tab === 'schools' && (
            schoolEntries.length === 0 ? (
              <EmptyState icon={GraduationCap} title="Belum ada peringkat sekolah" description="Peringkat sekolah akan muncul setelah pertandingan selesai" />
            ) : (
              <div className="space-y-2">
                {schoolEntries.map((e) => (
                  <div key={e.school_id} className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 sm:p-4 transition-colors',
                    e.rank <= 3
                      ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800/50'
                  )}>
                    {rankBadge(e.rank)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {e.school_logo && <Image src={e.school_logo} alt="" width={28} height={28} className="rounded-full" unoptimized />}
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 dark:text-zinc-100 truncate">{e.school_name}</p>
                          <p className="text-xs text-stone-500 dark:text-zinc-400">{e.team_count} tim</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-xl font-black text-esi-red tabular-nums">{e.total_points}</p>
                      <p className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-wider">poin</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
