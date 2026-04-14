'use client'

import { Fragment, useEffect, useState } from 'react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GraduationCap, PencilSimple, Trash, CaretDown, CaretRight, ArrowsLeftRight } from '@phosphor-icons/react'
import type { School, Team } from '@/types'

interface Props {
  schools: School[]
  teams: Team[]
  totalSchools: number
  onCreate: () => void
  onEdit: (s: School) => void
  onDelete: (id: string) => void
  onAssignTeam: (teamId: string, schoolId: string, onDone: () => void) => void
  assigningTeamId: string | null
  resetPageKey: string
}

const perPage = 20

export function SchoolsTable({
  schools,
  teams,
  totalSchools,
  onCreate,
  onEdit,
  onDelete,
  onAssignTeam,
  assigningTeamId,
  resetPageKey,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [assignTeamSchoolId, setAssignTeamSchoolId] = useState<string | null>(null)
  const [assignTeamSearch, setAssignTeamSearch] = useState('')

  function getTeamsForSchool(schoolId: string): Team[] {
    return teams.filter((t) => t.school?.id === schoolId)
  }

  function toggleExpand(schoolId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(schoolId)) next.delete(schoolId)
      else next.add(schoolId)
      return next
    })
  }

  const totalFiltered = schools.length
  const totalPages = Math.ceil(totalFiltered / perPage)
  const paginated = schools.slice((currentPage - 1) * perPage, currentPage * perPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [resetPageKey])

  return (
    <>
      <div className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
        Menampilkan <span className="font-semibold text-stone-900 dark:text-zinc-100">{totalFiltered}</span> dari <span className="font-semibold text-stone-900 dark:text-zinc-100">{totalSchools}</span> sekolah
        {totalPages > 1 && <span className="text-stone-400 dark:text-zinc-500"> · Halaman {currentPage} dari {totalPages}</span>}
      </div>

      {totalFiltered === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Belum Ada Sekolah"
          description="Tambahkan sekolah peserta."
          actionLabel="Tambah Sekolah"
          onAction={onCreate}
        />
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider w-8" />
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Logo</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Nama Sekolah</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Jenjang</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Tim</TableHead>
                  <TableHead className="hidden md:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Alamat</TableHead>
                  <TableHead className="hidden md:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Kota</TableHead>
                  <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((school) => {
                  const schoolTeams = getTeamsForSchool(school.id)
                  const isExpanded = expandedIds.has(school.id)

                  return (
                    <Fragment key={school.id}>
                      <TableRow
                        className="border-stone-100 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        onClick={() => toggleExpand(school.id)}
                      >
                        <TableCell className="w-8 px-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(school.id) }}
                            className="p-0.5 rounded hover:bg-stone-200 text-stone-400 dark:text-zinc-500 transition-colors"
                          >
                            {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                          </button>
                        </TableCell>
                        <TableCell className="w-10">
                          {school.logo_url ? (
                            <img
                              src={school.logo_url}
                              alt={school.name}
                              className="h-8 w-8 rounded-md object-cover border border-stone-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
                              <GraduationCap size={16} className="text-stone-400 dark:text-zinc-500" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-stone-900 dark:text-zinc-100">{school.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-stone-600 dark:text-zinc-400">
                            {school.level}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            schoolTeams.length > 0
                              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 border border-blue-200'
                              : 'bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500'
                          }`}>
                            {schoolTeams.length}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-stone-500 dark:text-zinc-400">
                          {school.address ?? '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-stone-500 dark:text-zinc-400">{school.city}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => onEdit(school)}
                              className="text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100"
                            >
                              <PencilSimple size={14} />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => onDelete(school.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${school.id}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={8} className="p-0">
                            <div className="border-l-2 border-esi-red/30 bg-stone-50 dark:bg-zinc-800/50 px-6 py-3 ml-4">
                              {school.coach_phone && (
                                <p className="mb-2 text-xs text-stone-500 dark:text-zinc-400">
                                  <span className="font-medium text-stone-600 dark:text-zinc-400">Telepon Pembina:</span>{' '}
                                  {school.coach_phone}
                                </p>
                              )}

                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                                  Tim Terdaftar ({schoolTeams.length})
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAssignTeamSchoolId(assignTeamSchoolId === school.id ? null : school.id)
                                    setAssignTeamSearch('')
                                  }}
                                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                    assignTeamSchoolId === school.id
                                      ? 'bg-esi-red text-white'
                                      : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700'
                                  }`}
                                >
                                  <ArrowsLeftRight size={12} />
                                  Assign Tim
                                </button>
                              </div>
                              {schoolTeams.length === 0 ? (
                                <p className="text-xs text-stone-400 dark:text-zinc-500 italic mb-2">Belum ada tim terdaftar</p>
                              ) : (
                                <div className="space-y-1.5 mb-2">
                                  {schoolTeams.map((team) => (
                                    <div
                                      key={team.id}
                                      className="flex items-center gap-3 rounded-lg bg-white dark:bg-zinc-900 px-3 py-2 border border-stone-100 dark:border-zinc-700"
                                    >
                                      <span className="text-sm font-medium text-stone-800 dark:text-zinc-200">{team.name}</span>
                                      <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-zinc-400">
                                        {team.game?.name ?? '-'}
                                      </span>
                                      <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                                        {team.member_count} anggota
                                      </span>
                                      <StatusBadge status={team.status} className="text-[10px] px-1.5 py-0" />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {assignTeamSchoolId === school.id && (
                                <div className="mt-2 rounded-lg border border-esi-red/20 bg-white dark:bg-zinc-900 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                  <p className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Pindahkan tim ke sekolah ini:</p>
                                  <Input
                                    placeholder="Cari nama tim..."
                                    value={assignTeamSearch}
                                    onChange={(e) => setAssignTeamSearch(e.target.value)}
                                    className="text-xs border-stone-300 dark:border-zinc-600"
                                  />
                                  <div className="max-h-40 overflow-y-auto space-y-1">
                                    {teams
                                      .filter((t) => {
                                        if (t.school?.id === school.id) return false
                                        if (assignTeamSearch.trim() && !t.name.toLowerCase().includes(assignTeamSearch.toLowerCase())) return false
                                        return true
                                      })
                                      .slice(0, 20)
                                      .map((t) => (
                                        <div key={t.id} className="flex items-center justify-between rounded-lg bg-stone-50 dark:bg-zinc-800/50 px-3 py-1.5 border border-stone-100 dark:border-zinc-700">
                                          <div className="min-w-0">
                                            <span className="text-xs font-medium text-stone-800 dark:text-zinc-200">{t.name}</span>
                                            <span className="ml-1.5 text-[10px] text-stone-400 dark:text-zinc-500">
                                              {t.game?.name} · {t.school?.name ?? 'Tanpa sekolah'}
                                            </span>
                                          </div>
                                          <Button
                                            size="xs"
                                            disabled={assigningTeamId === t.id}
                                            onClick={() => onAssignTeam(t.id, school.id, () => {
                                              setAssignTeamSchoolId(null)
                                              setAssignTeamSearch('')
                                            })}
                                            className="ml-2 shrink-0 bg-esi-red hover:bg-red-700 text-[10px] px-2 py-0.5"
                                          >
                                            {assigningTeamId === t.id ? '...' : 'Pindah'}
                                          </Button>
                                        </div>
                                      ))}
                                    {teams.filter((t) => t.school?.id !== school.id && (!assignTeamSearch.trim() || t.name.toLowerCase().includes(assignTeamSearch.toLowerCase()))).length === 0 && (
                                      <p className="text-xs text-stone-400 dark:text-zinc-500 text-center py-1">Tidak ada tim lain</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-200 dark:border-zinc-700 px-4 py-3">
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalFiltered)} dari {totalFiltered}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
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
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                          currentPage === p
                            ? 'border-esi-red bg-esi-red text-white'
                            : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
