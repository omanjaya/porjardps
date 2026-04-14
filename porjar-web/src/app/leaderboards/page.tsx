'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { PublicLayout } from '@/components/layouts/PublicLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Users, GraduationCap, Medal, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type {
  Event, TeamLeaderboardEntry, UserLeaderboardEntry, SchoolLeaderboardEntry,
} from '@/types'

const LIMIT = 25

export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<PublicLayout><div className="space-y-4"><Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" /><Skeleton className="h-96 w-full bg-stone-100 dark:bg-zinc-800" /></div></PublicLayout>}>
      <LeaderboardsContent />
    </Suspense>
  )
}

function LeaderboardsContent() {
  const searchParams = useSearchParams()
  const initialEventId = searchParams.get('event_id') ?? 'all'

  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId)
  const [teamEntries, setTeamEntries] = useState<TeamLeaderboardEntry[]>([])
  const [userEntries, setUserEntries] = useState<UserLeaderboardEntry[]>([])
  const [schoolEntries, setSchoolEntries] = useState<SchoolLeaderboardEntry[]>([])
  const [teamTotal, setTeamTotal] = useState(0)
  const [userTotal, setUserTotal] = useState(0)
  const [schoolTotal, setSchoolTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Event[]>('/events').then(setEvents).catch(() => {})
  }, [])

  const loadLeaderboards = useCallback(async () => {
    setLoading(true)
    try {
      const eventParam = selectedEventId !== 'all' ? `&event_id=${selectedEventId}` : ''
      const [teams, users, schools] = await Promise.all([
        api.getPaginated<TeamLeaderboardEntry[]>(`/leaderboards/teams?limit=${LIMIT}&page=${page}${eventParam}`),
        api.getPaginated<UserLeaderboardEntry[]>(`/leaderboards/users?limit=${LIMIT}&page=${page}${eventParam}`),
        api.getPaginated<SchoolLeaderboardEntry[]>(`/leaderboards/schools?limit=${LIMIT}&page=${page}${eventParam}`),
      ])
      setTeamEntries(teams.data ?? [])
      setUserEntries(users.data ?? [])
      setSchoolEntries(schools.data ?? [])
      setTeamTotal(teams.meta?.total_pages ?? 1)
      setUserTotal(users.meta?.total_pages ?? 1)
      setSchoolTotal(schools.meta?.total_pages ?? 1)
    } catch {
      console.error('Gagal memuat leaderboard')
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, page])

  useEffect(() => {
    loadLeaderboards()
  }, [loadLeaderboards])

  // Reset page when event filter changes
  useEffect(() => {
    setPage(1)
  }, [selectedEventId])

  const maxPages = Math.max(teamTotal, userTotal, schoolTotal)

  const rankIcon = (rank: number) => {
    if (rank > 3) return null
    return (
      <Trophy
        size={14}
        weight="fill"
        className={cn(
          rank === 1 && 'text-amber-500',
          rank === 2 && 'text-stone-400 dark:text-zinc-500',
          rank === 3 && 'text-amber-700'
        )}
      />
    )
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Leaderboard"
        description="Peringkat tim, pemain, dan sekolah berdasarkan poin event"
        breadcrumbs={[{ label: 'Leaderboard' }]}
      />

      <div className="mb-6">
        <Select value={selectedEventId} onValueChange={(val) => setSelectedEventId(val ?? 'all')}>
          <SelectTrigger className="w-[280px] bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700">
            <SelectValue placeholder="Pilih Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Event</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-96 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      ) : (
        <Tabs defaultValue="teams">
          <TabsList className="bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
            <TabsTrigger value="teams" className="text-stone-600 dark:text-zinc-400 data-active:bg-esi-red data-active:text-white">
              <Users size={14} className="mr-1.5" /> Tim
            </TabsTrigger>
            <TabsTrigger value="users" className="text-stone-600 dark:text-zinc-400 data-active:bg-esi-red data-active:text-white">
              <Medal size={14} className="mr-1.5" /> Pemain
            </TabsTrigger>
            <TabsTrigger value="schools" className="text-stone-600 dark:text-zinc-400 data-active:bg-esi-red data-active:text-white">
              <GraduationCap size={14} className="mr-1.5" /> Sekolah
            </TabsTrigger>
          </TabsList>

          {/* Team Leaderboard */}
          <TabsContent value="teams" className="mt-4">
            <LeaderboardTable
              columns={['#', 'Tim', 'Sekolah', 'Poin']}
              empty={teamEntries.length === 0}
              rows={teamEntries.map((e) => (
                <TableRow key={e.team_id} className="border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                  <TableCell className="font-bold text-stone-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">{rankIcon(e.rank)} {e.rank}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {e.team_logo_url && <Image src={e.team_logo_url} alt="" width={24} height={24} className="rounded-full" />}
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{e.team_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-500 dark:text-zinc-400">{e.school_name ?? '-'}</TableCell>
                  <TableCell className="text-right font-bold text-esi-red tabular-nums">{e.total_points}</TableCell>
                </TableRow>
              ))}
            />
          </TabsContent>

          {/* User Leaderboard */}
          <TabsContent value="users" className="mt-4">
            <LeaderboardTable
              columns={['#', 'Pemain', 'Poin']}
              empty={userEntries.length === 0}
              rows={userEntries.map((e) => (
                <TableRow key={e.user_id} className="border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                  <TableCell className="font-bold text-stone-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">{rankIcon(e.rank)} {e.rank}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {e.avatar_url && <Image src={e.avatar_url} alt="" width={24} height={24} className="rounded-full" />}
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{e.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-esi-red tabular-nums">{e.total_points}</TableCell>
                </TableRow>
              ))}
            />
          </TabsContent>

          {/* School Leaderboard */}
          <TabsContent value="schools" className="mt-4">
            <LeaderboardTable
              columns={['#', 'Sekolah', 'Tim', 'Poin']}
              empty={schoolEntries.length === 0}
              rows={schoolEntries.map((e) => (
                <TableRow key={e.school_id} className="border-stone-100 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                  <TableCell className="font-bold text-stone-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">{rankIcon(e.rank)} {e.rank}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {e.school_logo && <Image src={e.school_logo} alt="" width={24} height={24} className="rounded-full" />}
                      <span className="font-medium text-stone-900 dark:text-zinc-100">{e.school_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-stone-500 dark:text-zinc-400 tabular-nums">{e.team_count}</TableCell>
                  <TableCell className="text-right font-bold text-esi-red tabular-nums">{e.total_points}</TableCell>
                </TableRow>
              ))}
            />
          </TabsContent>

          {/* Pagination */}
          {maxPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <CaretLeft size={14} /> Sebelumnya
              </Button>
              <span className="text-sm text-stone-500 dark:text-zinc-400">Halaman {page} dari {maxPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= maxPages}>
                Selanjutnya <CaretRight size={14} />
              </Button>
            </div>
          )}
        </Tabs>
      )}
    </PublicLayout>
  )
}

function LeaderboardTable({ columns, rows, empty }: { columns: string[]; rows: React.ReactNode; empty: boolean }) {
  const lastIdx = columns.length - 1
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200 dark:border-zinc-700 bg-esi-red/5 hover:bg-esi-red/5">
              {columns.map((col, i) => (
                <TableHead
                  key={col}
                  className={cn(
                    'text-stone-600 dark:text-zinc-400 font-semibold',
                    i === 0 && 'w-16',
                    i === lastIdx && 'text-right',
                    col === 'Tim' && i > 0 && i < lastIdx && 'text-center',
                  )}
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {empty ? (
              <TableRow><TableCell colSpan={columns.length} className="p-0"><EmptyState size="sm" icon={Trophy} title="Belum ada data" description="Data leaderboard akan muncul setelah pertandingan dimulai." /></TableCell></TableRow>
            ) : rows}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
