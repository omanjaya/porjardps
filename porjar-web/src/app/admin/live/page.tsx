'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AdminScoreInput, type GameScore } from '@/components/modules/admin/AdminScoreInput'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Lightning, Trophy, Crosshair } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { BracketMatch, BRLobby } from '@/types'

export default function AdminLivePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [lobbies, setLobbies] = useState<BRLobby[]>([])
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      // Fetch all tournaments, then get bracket matches from each
      const tournaments = (await api.get<any[]>('/tournaments')) ?? []
      const allMatches: BracketMatch[] = []
      for (const t of tournaments) {
        try {
          const bracket = (await api.get<BracketMatch[]>(`/tournaments/${t.id}/bracket`)) ?? []
          const liveOrScheduled = bracket.filter(m => m.status === 'live' || m.status === 'scheduled')
          allMatches.push(...liveOrScheduled)
        } catch (err) { console.error(`Gagal memuat bracket turnamen ${t.id}:`, err) }
      }
      setMatches(allMatches)
      setLobbies([])
    } catch {
      toast.error('Gagal memuat data live')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleQuickSetLive(matchId: string) {
    try {
      await api.put(`/admin/matches/${matchId}/status`, { status: 'live' })
      toast.success('Match dimulai')
      await loadData()
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  async function handleQuickComplete(matchId: string) {
    try {
      await api.put(`/admin/matches/${matchId}/status`, { status: 'completed' })
      toast.success('Match selesai')
      await loadData()
    } catch {
      toast.error('Gagal mengubah status')
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

  async function handleLobbyStatusChange(lobbyId: string, status: string) {
    try {
      await api.put(`/admin/lobbies/${lobbyId}/status`, { status })
      toast.success('Status lobby diperbarui')
      await loadData()
    } catch {
      toast.error('Gagal mengubah status lobby')
    }
  }

  const liveMatches = matches.filter((m) => m.status === 'live')
  const scheduledMatches = matches.filter((m) => m.status === 'scheduled')
  const liveLobbies = lobbies.filter((l) => l.status === 'live')
  const scheduledLobbies = lobbies.filter((l) => l.status === 'scheduled')

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Live Score Panel"
        description="Kelola skor pertandingan yang sedang berlangsung"
      />

      <Tabs defaultValue="bracket">
        <TabsList className="bg-stone-100 border border-stone-200">
          <TabsTrigger value="bracket" className="text-stone-600 data-active:text-stone-900">
            <Trophy size={14} className="mr-1" />
            Bracket Matches ({liveMatches.length + scheduledMatches.length})
          </TabsTrigger>
          <TabsTrigger value="br" className="text-stone-600 data-active:text-stone-900">
            <Crosshair size={14} className="mr-1" />
            Battle Royale ({liveLobbies.length + scheduledLobbies.length})
          </TabsTrigger>
        </TabsList>

        {/* Bracket tab */}
        <TabsContent value="bracket" className="mt-4 space-y-6">
          {/* Live matches */}
          {liveMatches.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-700">
                <span className="h-4 w-1 rounded-full bg-porjar-red" />
                <Lightning size={14} weight="fill" className="text-porjar-red" />
                LIVE ({liveMatches.length})
              </h3>
              <div className="space-y-2">
                {liveMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 rounded-xl border-l-4 border-porjar-red bg-white border-y border-r border-y-stone-200 border-r-stone-200 shadow-sm px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-900">
                          {match.team_a?.name ?? 'TBD'}
                        </span>
                        <span className="text-lg font-bold text-porjar-red tabular-nums">
                          {match.score_a} - {match.score_b}
                        </span>
                        <span className="text-sm font-semibold text-stone-900">
                          {match.team_b?.name ?? 'TBD'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">
                        BO{match.best_of} &middot; Round {match.round}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedMatch(match)} className="border-stone-300 text-stone-600">
                        Input Skor
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleQuickComplete(match.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled matches */}
          {scheduledMatches.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-700">
                <span className="mr-2 inline-block h-4 w-1 rounded-full bg-stone-300" />
                Scheduled ({scheduledMatches.length})
              </h3>
              <div className="space-y-2">
                {scheduledMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white shadow-sm px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-stone-700">
                        {match.team_a?.name ?? 'TBD'} vs {match.team_b?.name ?? 'TBD'}
                      </span>
                      <p className="text-xs text-stone-400">
                        BO{match.best_of} &middot; Round {match.round}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleQuickSetLive(match.id)}
                      className="bg-porjar-red hover:bg-porjar-red-dark text-white"
                    >
                      Set Live
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liveMatches.length === 0 && scheduledMatches.length === 0 && (
            <EmptyState
              icon={Trophy}
              title="Tidak Ada Match"
              description="Belum ada bracket match yang live atau scheduled."
            />
          )}
        </TabsContent>

        {/* BR tab */}
        <TabsContent value="br" className="mt-4 space-y-6">
          {liveLobbies.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-700">
                <span className="h-4 w-1 rounded-full bg-porjar-red" />
                <Lightning size={14} weight="fill" className="text-porjar-red" />
                LIVE ({liveLobbies.length})
              </h3>
              <div className="space-y-2">
                {liveLobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    className="flex items-center gap-4 rounded-xl border-l-4 border-porjar-red bg-white border-y border-r border-y-stone-200 border-r-stone-200 shadow-sm px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">{lobby.lobby_name}</p>
                      <p className="text-xs text-stone-400">Day {lobby.day_number}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLobbyStatusChange(lobby.id, 'completed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Complete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scheduledLobbies.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-700">
                <span className="mr-2 inline-block h-4 w-1 rounded-full bg-stone-300" />
                Scheduled ({scheduledLobbies.length})
              </h3>
              <div className="space-y-2">
                {scheduledLobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white shadow-sm px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-700">{lobby.lobby_name}</p>
                      <p className="text-xs text-stone-400">Day {lobby.day_number}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLobbyStatusChange(lobby.id, 'live')}
                      className="bg-porjar-red hover:bg-porjar-red-dark text-white"
                    >
                      Set Live
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liveLobbies.length === 0 && scheduledLobbies.length === 0 && (
            <EmptyState
              icon={Crosshair}
              title="Tidak Ada Lobby"
              description="Belum ada BR lobby yang live atau scheduled."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Score input sheet */}
      <Sheet open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <SheetContent className="bg-white border-stone-200 overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle className="text-stone-900">
              {selectedMatch?.team_a?.name ?? 'TBD'} vs {selectedMatch?.team_b?.name ?? 'TBD'}
            </SheetTitle>
            <SheetDescription className="text-stone-500">
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
