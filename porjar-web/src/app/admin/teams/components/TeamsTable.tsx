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
import { CheckCircle, XCircle, PencilSimple, Trash, Eye } from '@phosphor-icons/react'
import type { Team } from '@/types'
import type { ConfirmAction } from '../hooks/useTeamCrud'

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
  currentPage,
  totalPages,
  perPage,
  totalFiltered,
  onPageChange,
}: Props) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
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
              <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Nama Tim</TableHead>
              <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Game</TableHead>
              <TableHead className="hidden sm:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Sekolah</TableHead>
              <TableHead className="hidden sm:table-cell text-center text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Anggota</TableHead>
              <TableHead className="hidden md:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
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
                <TableCell>
                  <span className="font-medium text-stone-900 dark:text-zinc-100">{team.name}</span>
                </TableCell>
                <TableCell className="text-stone-500 dark:text-zinc-400 text-sm">{team.game.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-stone-500 dark:text-zinc-400 text-sm">{team.school?.name ?? '-'}</TableCell>
                <TableCell className="hidden sm:table-cell text-center text-stone-500 dark:text-zinc-400 tabular-nums">{team.member_count}</TableCell>
                <TableCell className="hidden md:table-cell"><StatusBadge status={team.status} /></TableCell>
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
                        <Button size="xs" onClick={() => onConfirm({ teamId: team.id, teamName: team.name, action: 'approve' })} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle size={14} className="mr-0.5" />
                          Approve
                        </Button>
                        <Button size="xs" variant="destructive" onClick={() => onConfirm({ teamId: team.id, teamName: team.name, action: 'reject' })}>
                          <XCircle size={14} className="mr-0.5" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => onConfirm({ teamId: team.id, teamName: team.name, action: 'delete' })} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:bg-red-950/30">
                      <Trash size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
