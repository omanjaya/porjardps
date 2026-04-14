'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users, ShieldCheck, UserCircle, PencilSimple, Trash, Key, IdentificationCard } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types'
import { availableRoles, roleColors, roleLabels } from '../constants'

interface UsersTableProps {
  users: User[]
  totalUsers: number
  totalPages: number
  currentPage: number
  perPage: number
  onPageChange: (page: number) => void
  onEdit: (user: User) => void
  onResetPassword: (user: User) => void
  onShowCredential: (user: User) => void
  onDelete: (user: User) => void
  onChangeRole: (user: User, newRole: UserRole) => void
}

export function UsersTable({
  users,
  totalUsers,
  totalPages,
  currentPage,
  perPage,
  onPageChange,
  onEdit,
  onResetPassword,
  onShowCredential,
  onDelete,
  onChangeRole,
}: UsersTableProps) {
  const totalFiltered = totalUsers

  return (
    <>
      {/* Total counter */}
      <div className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
        Menampilkan <span className="font-semibold text-stone-900 dark:text-zinc-100">{totalFiltered}</span> dari <span className="font-semibold text-stone-900 dark:text-zinc-100">{users.length}</span> pengguna
        {totalPages > 1 && <span className="text-stone-400 dark:text-zinc-500"> · Halaman {currentPage} dari {totalPages}</span>}
      </div>

      {totalFiltered === 0 ? (
        <EmptyState icon={Users} title="Tidak Ada Pengguna" description="Tidak ada pengguna yang cocok dengan filter." />
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-zinc-700 hover:bg-transparent bg-stone-50 dark:bg-zinc-800/50">
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider whitespace-nowrap">Nama</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Email</TableHead>
                  <TableHead className="hidden sm:table-cell text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Telepon</TableHead>
                  <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Role</TableHead>
                  <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-stone-100 dark:border-zinc-700 hover:bg-red-50 dark:bg-red-950/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-zinc-800">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <UserCircle size={20} className="text-stone-400 dark:text-zinc-500" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-medium text-stone-900 dark:text-zinc-100 truncate">{user.full_name}</span>
                          {user.nomor_pertandingan && (
                            <span
                              className="inline-flex items-center rounded-md border border-esi-red/30 bg-esi-red/5 dark:bg-esi-red/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-esi-red"
                              title="Nomor Pertandingan"
                            >
                              {user.nomor_pertandingan}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-stone-500 dark:text-zinc-400">{user.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-stone-500 dark:text-zinc-400">
                      {user.phone ?? '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          roleColors[user.role]
                        )}
                      >
                        {user.role === 'superadmin' && <ShieldCheck size={12} weight="fill" />}
                        {roleLabels[user.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onEdit(user)}
                          className="text-stone-500 dark:text-zinc-400 hover:text-blue-600 h-7 w-7 p-0"
                          title="Edit pengguna"
                        >
                          <PencilSimple size={15} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onResetPassword(user)}
                          className="text-stone-500 dark:text-zinc-400 hover:text-amber-600 h-7 w-7 p-0"
                          title="Reset password"
                        >
                          <Key size={15} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onShowCredential(user)}
                          className="text-stone-500 dark:text-zinc-400 hover:text-indigo-600 h-7 w-7 p-0"
                          title="Kartu peserta"
                        >
                          <IdentificationCard size={15} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onDelete(user)}
                          className="text-stone-500 dark:text-zinc-400 hover:text-red-600 h-7 w-7 p-0"
                          title="Hapus pengguna"
                        >
                          <Trash size={15} />
                        </Button>
                        <span className="mx-1 h-4 w-px bg-stone-200" />
                        {availableRoles
                          .filter((r) => r !== user.role)
                          .map((role) => (
                            <Button
                              key={role}
                              size="xs"
                              variant="ghost"
                              onClick={() => onChangeRole(user, role)}
                              className="text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 dark:text-zinc-100 text-xs"
                            >
                              {roleLabels[role]}
                            </Button>
                          ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 border-t border-stone-200 dark:border-zinc-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalFiltered)} dari {totalFiltered}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                        onClick={() => onPageChange(p)}
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
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
