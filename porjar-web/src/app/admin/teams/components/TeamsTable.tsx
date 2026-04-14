'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { CheckCircle, XCircle, PencilSimple, Trash, Eye, CaretDown, SpinnerGap } from '@phosphor-icons/react'
import { ColumnToggle } from '@/components/shared/ColumnToggle'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import type { Team } from '@/types'
import type { ConfirmAction } from '../hooks/useTeamCrud'

const TEAMS_COLUMNS = [
  { key: 'name', label: 'Nama Tim' },
  { key: 'game', label: 'Game' },
  { key: 'school', label: 'Sekolah' },
  { key: 'members', label: 'Anggota' },
  { key: 'status', label: 'Status' },
] as const

const TEAMS_COLUMNS_DEFAULT: Record<string, boolean> = {
  name: true,
  game: true,
  school: true,
  members: true,
  status: true,
}

interface Props {
  teams: Team[]
  selectedIds: Set<string>
  pendingOnPage: Team[]
  allPendingSelected: boolean
  onToggleAll: () => void
  onToggleOne: (id: string) => void
  onView: (team: Team) => void
  onEdit: (team: Team) => void
  onConfirm: (a: ConfirmAction) => void
  onInlineStatusChange: (teamId: string, teamName: string, newStatus: 'approved' | 'rejected') => void
  inlineStatusLoading: string | null
  currentPage: number
  totalPages: number
  perPage: number
  totalFiltered: number
  onPageChange: (page: number) => void
}

export function TeamsTable({
  teams,
  selectedIds,
  pendingOnPage,
  allPendingSelected,
  onToggleAll,
  onToggleOne,
  onView,
  onEdit,
  onConfirm,
  onInlineStatusChange,
  inlineStatusLoading,
  currentPage,
  totalPages,
  perPage,
  totalFiltered,
  onPageChange,
}: Props) {
  const { visible, toggle } = useColumnVisibility('admin-teams-columns', TEAMS_COLUMNS_DEFAULT)
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="flex items-center justify-end gap-2 border-b border-stone-200 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/30 px-3 py-2">
        <ColumnToggle columns={[...TEAMS_COLUMNS]} visible={visible} onToggle={toggle} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
              <TableHead className="w-10 pl-4">
                {pendingOnPage.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={onToggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-stone-300 dark:border-zinc-600 accent-esi-red"
                    aria-label="Pilih semua pending"
                  />
                )}
              </TableHead>
              {visible.name && <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Nama Tim</TableHead>}
              {visible.game && <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Game</TableHead>}
              {visible.school && <TableHead className="hidden sm:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Sekolah</TableHead>}
              {visible.members && <TableHead className="hidden sm:table-cell text-center text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Anggota</TableHead>}
              {visible.status && <TableHead className="hidden md:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Status</TableHead>}
              <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => {
              const isLoading = inlineStatusLoading === team.id
              return (
              <TableRow key={team.id} className="border-stone-100 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                <TableCell className="pl-4">
                  {team.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(team.id)}
                      onChange={() => onToggleOne(team.id)}
                      className="h-4 w-4 cursor-pointer rounded border-stone-300 dark:border-zinc-600 accent-esi-red"
                      aria-label={`Pilih ${team.name}`}
                    />
                  )}
                </TableCell>
                {visible.name && (
                <TableCell>
                  <span className="font-medium text-stone-900 dark:text-zinc-100">{team.name}</span>
                </TableCell>
                )}
                {visible.game && <TableCell className="text-stone-500 dark:text-zinc-400 text-sm">{team.game.name}</TableCell>}
                {visible.school && <TableCell className="hidden sm:table-cell text-stone-500 dark:text-zinc-400 text-sm">{team.school?.name ?? '-'}</TableCell>}
                {visible.members && <TableCell className="hidden sm:table-cell text-center text-stone-500 dark:text-zinc-400 tabular-nums">{team.member_count}</TableCell>}
                {visible.status && (
                <TableCell className="hidden md:table-cell">
                  {team.status === 'pending' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={isLoading}
                        render={
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Ubah status ${team.name}`}
                          >
                            {isLoading ? (
                              <SpinnerGap size={10} className="animate-spin" />
                            ) : null}
                            Menunggu
                            <CaretDown size={10} weight="bold" />
                          </button>
                        }
                      />
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => onInlineStatusChange(team.id, team.name, 'approved')}
                          disabled={isLoading}
                        >
                          <CheckCircle size={14} className="text-green-600" />
                          <span>Setujui</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onInlineStatusChange(team.id, team.name, 'rejected')}
                          disabled={isLoading}
                        >
                          <XCircle size={14} className="text-red-600" />
                          <span>Tolak</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <StatusBadge status={team.status} />
                  )}
                </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button size="xs" variant="ghost" onClick={() => onView(team)} className="text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800">
                      <Eye size={14} />
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => onEdit(team)} className="text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700 dark:bg-zinc-800">
                      <PencilSimple size={14} />
                    </Button>
                    {team.status === 'pending' && (
                      <>
                        <Button
                          size="xs"
                          onClick={() => onInlineStatusChange(team.id, team.name, 'approved')}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 h-6 w-6 p-0"
                          aria-label={`Setujui ${team.name}`}
                        >
                          <CheckCircle size={14} />
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => onInlineStatusChange(team.id, team.name, 'rejected')}
                          disabled={isLoading}
                          className="h-6 w-6 p-0"
                          aria-label={`Tolak ${team.name}`}
                        >
                          <XCircle size={14} />
                        </Button>
                      </>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => onConfirm({ teamId: team.id, teamName: team.name, action: 'delete' })} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:bg-red-950/30">
                      <Trash size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-2 border-t border-stone-200 dark:border-zinc-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalFiltered)} dari {totalFiltered} tim
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 disabled:opacity-40 disabled:cursor-not-allowed">
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`dot-${i}`} className="px-1 text-xs text-stone-400 dark:text-zinc-500">...</span>
                ) : (
                  <button key={p} onClick={() => onPageChange(p)} className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${currentPage === p ? 'border-esi-red bg-esi-red text-white' : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'}`}>
                    {p}
                  </button>
                )
              )}
            <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 disabled:opacity-40 disabled:cursor-not-allowed">
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
