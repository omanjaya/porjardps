'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserPlus, Trash, MagnifyingGlass } from '@phosphor-icons/react'
import type { TeamDetail } from '@/types'
import type { PlayerResult } from '../hooks/usePlayerAssignment'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  detailTeam: TeamDetail | null
  detailLoading: boolean
  playerSearch: string
  setPlayerSearch: (s: string) => void
  playerResults: PlayerResult[]
  playerSearchLoading: boolean
  showUnassigned: boolean
  setShowUnassigned: (b: boolean) => void
  selectedPlayer: PlayerResult | null
  setSelectedPlayer: (p: PlayerResult | null) => void
  assignForm: { in_game_name: string; in_game_id: string; role: string }
  setAssignForm: React.Dispatch<React.SetStateAction<{ in_game_name: string; in_game_id: string; role: string }>>
  assignLoading: boolean
  onSearchPlayers: (query: string, unassigned: boolean) => void
  onAssignPlayer: () => void
  onRemoveMember: (memberId: string) => void
}

export function TeamDetailSheet(p: Props) {
  return (
    <Sheet open={p.open} onOpenChange={p.onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-stone-900 dark:text-zinc-100">{p.detailTeam?.name ?? 'Detail Tim'}</SheetTitle>
          <SheetDescription className="text-stone-500 dark:text-zinc-400">
            {p.detailTeam && `${p.detailTeam.game.name} · ${p.detailTeam.school?.name ?? 'Tanpa Sekolah'}`}
          </SheetDescription>
        </SheetHeader>

        {p.detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full bg-stone-200" />
            <Skeleton className="h-8 w-full bg-stone-200" />
            <Skeleton className="h-8 w-full bg-stone-200" />
          </div>
        ) : p.detailTeam ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-4 text-sm">
              <div>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Status</p>
                <StatusBadge status={p.detailTeam.status} />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Kapten</p>
                <p className="font-medium text-stone-900 dark:text-zinc-100">{p.detailTeam.captain?.full_name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Total Anggota</p>
                <p className="font-medium text-stone-900 dark:text-zinc-100">{p.detailTeam.member_count}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-zinc-400">Seed</p>
                <p className="font-medium text-stone-900 dark:text-zinc-100">{p.detailTeam.seed ?? '-'}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-zinc-300">Anggota Tim</h3>
              {p.detailTeam.members?.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-zinc-500">Belum ada anggota.</p>
              ) : (
                <div className="space-y-2">
                  {p.detailTeam.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">{member.full_name}</p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">{member.in_game_name} · <span className="capitalize">{member.role}</span></p>
                      </div>
                      {member.role !== 'captain' && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => p.onRemoveMember(member.user_id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:bg-red-950/30"
                        >
                          <Trash size={13} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <PlayerAssignmentForm {...p} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function PlayerAssignmentForm(p: Props) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-zinc-300">
          <UserPlus size={15} />
          Tambah Anggota
        </h3>
        <button
          onClick={() => {
            const next = !p.showUnassigned
            p.setShowUnassigned(next)
            p.onSearchPlayers(p.playerSearch, next)
          }}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            p.showUnassigned
              ? 'bg-esi-red text-white'
              : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
          }`}
        >
          Belum ada tim
        </button>
      </div>

      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500" />
        <Input
          placeholder="Cari nama / email pemain..."
          value={p.playerSearch}
          onChange={(e) => {
            p.setPlayerSearch(e.target.value)
            if (e.target.value.length === 0 || e.target.value.length >= 2) {
              p.onSearchPlayers(e.target.value, p.showUnassigned)
            }
          }}
          className="pl-7 text-xs border-stone-300 dark:border-zinc-600"
        />
      </div>

      {p.playerSearchLoading ? (
        <p className="text-xs text-stone-400 dark:text-zinc-500 text-center py-2">Mencari...</p>
      ) : p.playerResults.length > 0 ? (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {p.playerResults.map((pl) => (
            <button
              key={pl.id}
              onClick={() => { p.setSelectedPlayer(pl); p.setAssignForm({ in_game_name: '', in_game_id: '', role: 'member' }) }}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${
                p.selectedPlayer?.id === pl.id
                  ? 'bg-esi-red/10 border border-esi-red/30 text-esi-red'
                  : 'bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700'
              }`}
            >
              <span className="font-medium">{pl.full_name}</span>
              <span className="ml-1.5 text-stone-400 dark:text-zinc-500">{pl.email}</span>
            </button>
          ))}
        </div>
      ) : (p.playerSearch.length >= 2 || p.showUnassigned) && !p.playerSearchLoading ? (
        <p className="text-xs text-stone-400 dark:text-zinc-500 text-center py-2">Tidak ada pemain ditemukan</p>
      ) : null}

      {p.selectedPlayer && (
        <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">
            Tambahkan <span className="text-stone-900 dark:text-zinc-100">{p.selectedPlayer.full_name}</span>
          </p>
          <Input
            placeholder="In-game name *"
            value={p.assignForm.in_game_name}
            onChange={(e) => p.setAssignForm((f) => ({ ...f, in_game_name: e.target.value }))}
            className="text-xs border-stone-300 dark:border-zinc-600"
          />
          <Input
            placeholder="In-game ID (opsional)"
            value={p.assignForm.in_game_id}
            onChange={(e) => p.setAssignForm((f) => ({ ...f, in_game_id: e.target.value }))}
            className="text-xs border-stone-300 dark:border-zinc-600"
          />
          <select
            value={p.assignForm.role}
            onChange={(e) => p.setAssignForm((f) => ({ ...f, role: e.target.value }))}
            className="w-full rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-esi-red"
          >
            <option value="member">Member</option>
            <option value="substitute">Substitute</option>
            <option value="captain">Captain</option>
          </select>
          <div className="flex gap-2">
            <Button size="xs" onClick={p.onAssignPlayer} disabled={p.assignLoading} className="bg-esi-red hover:bg-red-700 flex-1">
              {p.assignLoading ? 'Menambahkan...' : 'Tambahkan'}
            </Button>
            <Button size="xs" variant="outline" onClick={() => p.setSelectedPlayer(null)} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
