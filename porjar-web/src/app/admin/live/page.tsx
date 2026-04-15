'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdminScoreInput, type GameScore } from '@/components/modules/admin/AdminScoreInput'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Lightning, Trophy, Power, TreeStructure, CalendarBlank, Siren } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { BracketMatch, BRLobby, Tournament } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

type MatchItem =
  | { kind: 'bracket'; match: BracketMatch }
  | { kind: 'br'; lobby: BRLobby }

interface TournamentBlock {
  tournament: Tournament
  items: MatchItem[]
  liveCount: number
  readyCount: number
}

interface DaySection {
  date: string   // 'YYYY-MM-DD' | 'unscheduled'
  label: string  // human-readable
  blocks: TournamentBlock[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isBR(t: Tournament) {
  return t.format === 'battle_royale_points'
}

function toDateKey(iso: string | null | undefined): string {
  if (!iso) return 'unscheduled'
  return iso.slice(0, 10)
}

function lobbyDateKey(lobby: BRLobby, tournament: Tournament): string {
  if (lobby.scheduled_at) return toDateKey(lobby.scheduled_at)
  if (tournament.start_date && lobby.day_number > 0) {
    const d = new Date(tournament.start_date)
    d.setDate(d.getDate() + lobby.day_number - 1)
    return d.toISOString().slice(0, 10)
  }
  return 'unscheduled'
}

function formatDayLabel(dateKey: string): string {
  if (dateKey === 'unscheduled') return 'Belum Dijadwalkan'
  const d = new Date(dateKey + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isReady(item: MatchItem): boolean {
  if (item.kind === 'bracket') {
    const m = item.match
    return (m.status === 'pending' || m.status === 'scheduled') && !!m.team_a && !!m.team_b
  }
  const l = item.lobby
  return l.status === 'pending' || l.status === 'scheduled'
}

function isLive(item: MatchItem): boolean {
  return item.kind === 'bracket' ? item.match.status === 'live' : item.lobby.status === 'live'
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminLivePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [days, setDays] = useState<DaySection[]>([])
  const [activeDay, setActiveDay] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      // 1. Fetch ALL tournaments (paginate)
      let allTournaments: Tournament[] = []
      let page = 1
      let totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<Tournament[]>(`/tournaments?per_page=100&page=${page}`)
        allTournaments = [...allTournaments, ...(Array.isArray(res.data) ? res.data : [])]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }

      // 2. Per-tournament: fetch matches or lobbies
      const dayMap = new Map<string, Map<string, TournamentBlock>>()

      await Promise.all(allTournaments.map(async (t) => {
        try {
          const items: MatchItem[] = []

          if (isBR(t)) {
            const lobbies = (await api.get<BRLobby[]>(`/tournaments/${t.id}/lobbies`)) ?? []
            for (const lobby of lobbies) {
              items.push({ kind: 'br', lobby })
            }
          } else {
            const bracket = (await api.get<BracketMatch[]>(`/tournaments/${t.id}/bracket`)) ?? []
            for (const match of bracket) {
              if (match.status === 'bye') continue
              items.push({ kind: 'bracket', match })
            }
          }

          if (items.length === 0) return

          // 3. Group items by day
          const itemsByDay = new Map<string, MatchItem[]>()
          for (const item of items) {
            const dk = item.kind === 'bracket'
              ? toDateKey(item.match.scheduled_at)
              : lobbyDateKey(item.lobby, t)
            const arr = itemsByDay.get(dk) ?? []
            arr.push(item)
            itemsByDay.set(dk, arr)
          }

          for (const [dk, dayItems] of itemsByDay) {
            if (!dayMap.has(dk)) dayMap.set(dk, new Map())
            const blockMap = dayMap.get(dk)!
            blockMap.set(t.id, {
              tournament: t,
              items: dayItems,
              liveCount: dayItems.filter(isLive).length,
              readyCount: dayItems.filter(isReady).length,
            })
          }
        } catch { /* skip broken tournaments */ }
      }))

      // 4. Sort days
      const sortedDates = Array.from(dayMap.keys()).sort((a, b) => {
        if (a === 'unscheduled') return 1
        if (b === 'unscheduled') return -1
        return a.localeCompare(b)
      })

      const sections: DaySection[] = sortedDates.map((dk) => ({
        date: dk,
        label: formatDayLabel(dk),
        blocks: Array.from(dayMap.get(dk)!.values()),
      }))

      setDays(sections)

      // Keep active day if valid, else pick first with live or earliest
      setActiveDay((prev) => {
        if (sections.find(s => s.date === prev)) return prev
        const liveDay = sections.find(s => s.blocks.some(b => b.liveCount > 0))
        return liveDay?.date ?? sections[0]?.date ?? ''
      })
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => { loadData() }, [loadData])

  // ── Actions ───────────────────────────────────────────────────────────

  async function setItemStatus(item: MatchItem, status: string) {
    if (item.kind === 'bracket') {
      await api.put(`/admin/matches/${item.match.id}/status`, { status })
    } else {
      await api.put(`/admin/lobbies/${item.lobby.id}/status`, { status })
    }
  }

  async function handleSetLive(item: MatchItem) {
    const id = item.kind === 'bracket' ? item.match.id : item.lobby.id
    setTogglingId(id)
    try {
      await setItemStatus(item, 'live')
      toast.success('Berhasil di-set live')
      await loadData()
    } catch {
      toast.error('Gagal set live')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSetOff(item: MatchItem) {
    const id = item.kind === 'bracket' ? item.match.id : item.lobby.id
    setTogglingId(id)
    try {
      // Revert to scheduled if it had a scheduled time, otherwise pending
      const hasSchedule = item.kind === 'bracket'
        ? !!item.match.scheduled_at
        : !!item.lobby.scheduled_at
      await setItemStatus(item, hasSchedule ? 'scheduled' : 'pending')
      toast.success('Live dimatikan')
      await loadData()
    } catch {
      toast.error('Gagal matikan live')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSetRoundLive(block: TournamentBlock) {
    setTogglingId(block.tournament.id)
    try {
      // For bracket: pick earliest round with ready matches
      if (!isBR(block.tournament)) {
        const readyBracket = block.items
          .filter(i => i.kind === 'bracket' && isReady(i))
          .map(i => (i as { kind: 'bracket'; match: BracketMatch }).match)
        if (readyBracket.length === 0) {
          const bracketItems = block.items.filter(i => i.kind === 'bracket')
          const allLive = bracketItems.length > 0 && bracketItems.every(isLive)
          const allDone = bracketItems.every(i => (i as { kind: 'bracket'; match: BracketMatch }).match.status === 'completed')
          if (allLive) toast.info('Semua match sudah live')
          else if (allDone) toast.info('Semua match sudah selesai')
          else toast.info('Tidak ada match siap — ada tim yang belum ditentukan')
          setTogglingId(null)
          return
        }
        const minRound = Math.min(...readyBracket.map(m => m.round))
        const roundMatches = readyBracket.filter(m => m.round === minRound)
        let ok = 0
        for (const m of roundMatches) {
          try { await api.put(`/admin/matches/${m.id}/status`, { status: 'live' }); ok++ } catch { /* skip */ }
        }
        toast.success(`${ok} match Round ${minRound} di-set live`)
      } else {
        // For BR: set all ready lobbies of this day live
        const readyLobbies = block.items.filter(i => i.kind === 'br' && isReady(i))
        let ok = 0
        for (const item of readyLobbies) {
          try { await setItemStatus(item, 'live'); ok++ } catch { /* skip */ }
        }
        toast.success(`${ok} lobby di-set live`)
      }
      await loadData()
    } catch {
      toast.error('Gagal set live')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleScoreSubmit(games: GameScore[]) {
    if (!selectedMatch) return
    try {
      await api.put(`/admin/matches/${selectedMatch.id}/score`, { games })
      toast.success('Skor berhasil disimpan')
      setSelectedMatch(null)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan skor')
    }
  }

  async function handleQuickComplete(item: MatchItem) {
    const id = item.kind === 'bracket' ? item.match.id : item.lobby.id
    setTogglingId(id)
    try {
      await setItemStatus(item, 'completed')
      toast.success('Selesai')
      await loadData()
    } catch {
      toast.error('Gagal mengubah status')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-3 h-10 w-full bg-stone-200" />
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full bg-stone-200" />)}
        </div>
      </AdminLayout>
    )
  }

  const totalLive = days.flatMap(d => d.blocks).reduce((s, b) => s + b.liveCount, 0)
  const activeSection = days.find(d => d.date === activeDay)

  return (
    <AdminLayout>
      <PageHeader
        title="Live Score Panel"
        description={totalLive > 0
          ? `${totalLive} match sedang berlangsung`
          : 'Set match live dan kelola skor'}
      />

      {days.length === 0 ? (
        <EmptyState icon={Trophy} title="Tidak Ada Match" description="Belum ada turnamen dengan bracket atau lobby." />
      ) : (
        <>
          {/* Day tabs */}
          <div className="mb-4 flex gap-1 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {days.map((day) => {
              const dayLive = day.blocks.reduce((s, b) => s + b.liveCount, 0)
              return (
                <button
                  key={day.date}
                  onClick={() => setActiveDay(day.date)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                    activeDay === day.date
                      ? 'bg-esi-red text-white shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:border-esi-red/40'
                  )}
                >
                  <CalendarBlank size={13} />
                  <span>{day.label}</span>
                  {dayLive > 0 && (
                    <span className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
                      activeDay === day.date ? 'bg-white/20 text-white' : 'bg-esi-red text-white'
                    )}>
                      {dayLive}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tournament blocks for active day */}
          {!activeSection || activeSection.blocks.length === 0 ? (
            <EmptyState icon={CalendarBlank} title="Tidak Ada Match" description="Tidak ada match di hari ini." />
          ) : (
            <div className="space-y-3">
              {activeSection.blocks.map((block) => {
                const liveItems = block.items.filter(isLive)
                const readyItems = block.items.filter(isReady)
                const completedCount = block.items.filter(i =>
                  i.kind === 'bracket' ? i.match.status === 'completed' : i.lobby.status === 'completed'
                ).length
                const hasLive = block.liveCount > 0

                return (
                  <div
                    key={block.tournament.id}
                    className={cn(
                      'rounded-xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden',
                      hasLive ? 'border-esi-red/40' : 'border-stone-200 dark:border-zinc-700'
                    )}
                  >
                    {/* Header */}
                    <div className={cn(
                      'flex items-center justify-between gap-2 px-4 py-3',
                      hasLive ? 'bg-red-50 dark:bg-red-950/20' : 'bg-stone-50 dark:bg-zinc-800/50'
                    )}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {hasLive && <span className="h-2 w-2 shrink-0 rounded-full bg-esi-red animate-pulse" />}
                          <h3 className="truncate text-sm font-bold text-stone-900 dark:text-zinc-100">
                            {block.tournament.name}
                          </h3>
                          <span className="shrink-0 rounded-full bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:text-zinc-400">
                            {isBR(block.tournament) ? 'Battle Royale' : block.tournament.format.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
                          {completedCount}/{block.items.length} selesai
                          {block.liveCount > 0 && <> · <span className="font-semibold text-esi-red">{block.liveCount} live</span></>}
                          {block.readyCount > 0 && <> · {block.readyCount} siap</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {/* Bulk set live button */}
                        {readyItems.length > 0 && !hasLive && (
                          <Button
                            size="xs"
                            onClick={() => handleSetRoundLive(block)}
                            disabled={togglingId === block.tournament.id}
                            className="bg-stone-800 hover:bg-stone-900 text-white text-[11px]"
                          >
                            <Power size={12} weight="bold" className="mr-1" />
                            {togglingId === block.tournament.id ? '...' : `Live Semua (${readyItems.length})`}
                          </Button>
                        )}
                        {!isBR(block.tournament) && (
                          <Link
                            href={`/admin/tournaments/${block.tournament.id}/bracket`}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <TreeStructure size={13} />
                            <span className="hidden sm:inline">Bracket</span>
                          </Link>
                        )}
                        {isBR(block.tournament) && (
                          <Link
                            href={`/admin/tournaments/${block.tournament.id}/lobbies`}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Siren size={13} />
                            <span className="hidden sm:inline">Lobbies</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Live items */}
                    {liveItems.length > 0 && (
                      <div className="border-t border-stone-100 dark:border-zinc-700/60 px-4 py-3 space-y-2">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                          <Lightning size={10} weight="fill" className="text-esi-red" />
                          Sedang Live ({liveItems.length})
                        </p>
                        {liveItems.map((item) => {
                          const id = item.kind === 'bracket' ? item.match.id : item.lobby.id
                          const label = item.kind === 'bracket'
                            ? `${item.match.team_a?.name ?? 'TBD'} ${item.match.score_a}–${item.match.score_b} ${item.match.team_b?.name ?? 'TBD'}`
                            : item.lobby.lobby_name
                          const sub = item.kind === 'bracket'
                            ? `R${item.match.round} M${item.match.match_number}`
                            : `Hari ${item.lobby.day_number} · Lobby ${item.lobby.lobby_number}`

                          return (
                            <div key={id} className="flex flex-wrap items-center gap-2 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-stone-800 dark:text-zinc-200">{label}</p>
                                <p className="text-[10px] text-stone-400 dark:text-zinc-500">{sub}</p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                {item.kind === 'bracket' && (
                                  <Button size="xs" variant="outline" onClick={() => setSelectedMatch(item.match)} className="h-7 text-xs border-stone-300 dark:border-zinc-600">
                                    Skor
                                  </Button>
                                )}
                                <Button size="xs" onClick={() => handleQuickComplete(item)} disabled={togglingId === id} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                                  Selesai
                                </Button>
                                <Button size="xs" variant="outline" onClick={() => handleSetOff(item)} disabled={togglingId === id} className="h-7 text-xs border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
                                  <Power size={11} />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Ready items */}
                    {readyItems.length > 0 && (
                      <div className="border-t border-stone-100 dark:border-zinc-700/60 px-4 py-3 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                          Siap Dimulai ({readyItems.length})
                        </p>
                        {readyItems.map((item) => {
                          const id = item.kind === 'bracket' ? item.match.id : item.lobby.id
                          const label = item.kind === 'bracket'
                            ? `${item.match.team_a?.name ?? 'TBD'} vs ${item.match.team_b?.name ?? 'TBD'}`
                            : item.lobby.lobby_name
                          const sub = item.kind === 'bracket'
                            ? `R${item.match.round} M${item.match.match_number}`
                            : `Hari ${item.lobby.day_number} · Lobby ${item.lobby.lobby_number}`

                          return (
                            <div key={id} className="flex items-center gap-2 rounded-lg bg-stone-50 dark:bg-zinc-800/50 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-stone-700 dark:text-zinc-300">{label}</p>
                                <p className="text-[10px] text-stone-400 dark:text-zinc-500">{sub}</p>
                              </div>
                              <Button
                                size="xs"
                                onClick={() => handleSetLive(item)}
                                disabled={togglingId === id}
                                className="h-7 shrink-0 bg-stone-800 hover:bg-stone-900 text-white text-[11px]"
                              >
                                <Power size={11} weight="bold" className="mr-1" />
                                {togglingId === id ? '...' : 'Set Live'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Score input sheet */}
      <Sheet open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <SheetContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle className="text-stone-900 dark:text-zinc-100">
              {selectedMatch?.team_a?.name ?? 'TBD'} vs {selectedMatch?.team_b?.name ?? 'TBD'}
            </SheetTitle>
            <SheetDescription className="text-stone-500 dark:text-zinc-400">
              Input skor pertandingan
            </SheetDescription>
          </SheetHeader>
          {selectedMatch && (
            <div className="p-4">
              <AdminScoreInput
                match={selectedMatch}
                bestOf={selectedMatch.best_of}
                onSubmit={handleScoreSubmit}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  )
}
