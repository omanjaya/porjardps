'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  UserCircle,
  Plus,
  Trash,
  MagnifyingGlass,
  UsersThree,
  Spinner,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import type { Event } from '@/types'
import type { User } from '@/types'

interface EventAdmin {
  id: string
  event_id: string
  user_id: string
  assigned_by: string | null
  created_at: string
  user_full_name: string
  user_email: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function UserInitial({ name }: { name: string }) {
  const initial = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-esi-red/10 text-esi-red text-xs font-bold">
      {initial}
    </div>
  )
}

export default function EventAdminsPage() {
  const params = useParams<{ id: string }>()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [event, setEvent] = useState<Event | null>(null)
  const [admins, setAdmins] = useState<EventAdmin[]>([])
  const [loading, setLoading] = useState(true)

  // Add admin dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<EventAdmin | null>(null)
  const [removing, setRemoving] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      const [eventData, adminsData] = await Promise.all([
        api.get<Event>(`/admin/events/${params.id}`),
        api.get<EventAdmin[]>(`/admin/events/${params.id}/admins`),
      ])
      setEvent(eventData ?? null)
      setAdmins(Array.isArray(adminsData) ? adminsData : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [params.id, isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  // Fetch users when debounced search changes
  useEffect(() => {
    if (!addDialogOpen) return
    if (debouncedSearch.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    api
      .get<User[]>(`/admin/users?search=${encodeURIComponent(debouncedSearch)}&per_page=20`)
      .then((data) => setSearchResults(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Gagal mencari pengguna'))
      .finally(() => setSearchLoading(false))
  }, [debouncedSearch, addDialogOpen])

  function openAddDialog() {
    setUserSearch('')
    setDebouncedSearch('')
    setSearchResults([])
    setSelectedUserId('')
    setAddDialogOpen(true)
  }

  async function handleAssign() {
    if (!selectedUserId) {
      toast.error('Pilih pengguna terlebih dahulu')
      return
    }
    setAssigning(true)
    try {
      await api.post(`/admin/events/${params.id}/admins`, { user_id: selectedUserId })
      toast.success('Admin berhasil ditambahkan')
      setAddDialogOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambahkan admin')
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await api.delete(`/admin/events/${params.id}/admins/${removeTarget.user_id}`)
      toast.success(`${removeTarget.user_full_name} dihapus dari admin event`)
      setRemoveTarget(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus admin')
    } finally {
      setRemoving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-stone-100 dark:bg-zinc-800" />
          <Skeleton className="h-64 w-full bg-stone-100 dark:bg-zinc-800" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={event ? `Admin Event: ${event.name}` : 'Admin Event'}
        description="Kelola pengguna yang memiliki akses admin untuk event ini"
        breadcrumbs={[
          { label: 'Events', href: '/admin/events' },
          { label: event?.name ?? '...', href: `/admin/events/${params.id}` },
          { label: 'Admins' },
        ]}
        actions={
          <Button onClick={openAddDialog} className="bg-esi-red text-white hover:bg-esi-red/90">
            <Plus size={16} className="mr-1.5" />
            Tambah Admin
          </Button>
        }
      />

      {admins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800/50 p-10 text-center">
          <UsersThree size={40} className="mx-auto mb-3 text-stone-400 dark:text-zinc-500" />
          <p className="text-sm font-medium text-stone-600 dark:text-zinc-300">Belum ada admin event</p>
          <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">
            Tambahkan pengguna sebagai admin untuk event ini
          </p>
          <Button
            onClick={openAddDialog}
            size="sm"
            className="mt-4 bg-esi-red text-white hover:bg-esi-red/90"
          >
            <Plus size={14} className="mr-1" />
            Tambah Admin
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 hover:bg-stone-50 dark:hover:bg-zinc-800/50">
                <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Pengguna</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Email</TableHead>
                <TableHead className="text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Ditambahkan</TableHead>
                <TableHead className="text-right text-stone-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow
                  key={admin.id}
                  className="border-stone-100 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserInitial name={admin.user_full_name} />
                      <span className="font-medium text-stone-900 dark:text-zinc-100">
                        {admin.user_full_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-stone-600 dark:text-zinc-400">
                    {admin.user_email}
                  </TableCell>
                  <TableCell className="text-sm text-stone-500 dark:text-zinc-500">
                    {formatDate(admin.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Hapus admin"
                      onClick={() => setRemoveTarget(admin)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash size={15} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Admin Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (!open) setAddDialogOpen(false)
        }}
      >
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-900 dark:text-zinc-100">Tambah Admin Event</DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Cari pengguna berdasarkan nama atau email untuk ditambahkan sebagai admin event ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500"
              />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari nama atau email..."
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 pl-9 focus:border-esi-red"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-200 dark:border-zinc-700">
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-stone-400 dark:text-zinc-500">
                  <Spinner size={16} className="animate-spin" />
                  Mencari...
                </div>
              ) : userSearch.length < 2 ? (
                <div className="p-4 text-center text-sm text-stone-400 dark:text-zinc-500">
                  Ketik minimal 2 karakter untuk mencari
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center gap-1 p-6 text-center">
                  <UserCircle size={28} className="text-stone-300 dark:text-zinc-600" />
                  <p className="text-sm text-stone-400 dark:text-zinc-500">Pengguna tidak ditemukan</p>
                </div>
              ) : (
                searchResults.map((user) => {
                  const alreadyAdmin = admins.some((a) => a.user_id === user.id)
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={alreadyAdmin}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-stone-100 dark:border-zinc-700 last:border-0 ${
                        alreadyAdmin
                          ? 'opacity-50 cursor-not-allowed bg-stone-50 dark:bg-zinc-800/30'
                          : selectedUserId === user.id
                            ? 'bg-red-50 dark:bg-red-950/30 text-esi-red'
                            : 'hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300'
                      }`}
                    >
                      <UserInitial name={user.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.full_name}</p>
                        <p className="text-[11px] text-stone-400 dark:text-zinc-500 truncate">{user.email}</p>
                      </div>
                      {alreadyAdmin && (
                        <span className="text-[10px] font-medium bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                          Sudah admin
                        </span>
                      )}
                      {selectedUserId === user.id && !alreadyAdmin && (
                        <div className="h-2 w-2 rounded-full bg-esi-red shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={assigning}
              className="border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !selectedUserId}
              className="bg-esi-red text-white hover:bg-esi-red/90"
            >
              {assigning && <Spinner size={14} className="mr-1 animate-spin" />}
              {assigning ? 'Menyimpan...' : 'Tambah Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Hapus Admin Event"
        description={`Yakin ingin menghapus "${removeTarget?.user_full_name}" dari admin event ini?`}
        confirmLabel={removing ? 'Menghapus...' : 'Hapus'}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={removing}
        variant="destructive"
      />
    </>
  )
}
