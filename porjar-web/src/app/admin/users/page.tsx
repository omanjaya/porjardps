'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Users, ShieldCheck, UserCircle, Plus, PencilSimple, Trash, Key, Copy, Eye, EyeSlash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { ExportButton } from '@/components/shared/ExportButton'
import type { User, UserRole } from '@/types'

const roleLabels: Record<UserRole, string> = {
  player: 'Player',
  admin: 'Admin',
  superadmin: 'Superadmin',
  coach: 'Guru Pembina',
}

const roleColors: Record<UserRole, string> = {
  player: 'bg-stone-100 text-stone-600 border-stone-300',
  admin: 'bg-blue-50 text-blue-600 border-blue-200',
  superadmin: 'bg-amber-50 text-amber-600 border-amber-200',
  coach: 'bg-green-50 text-green-600 border-green-200',
}

const availableRoles: UserRole[] = ['player', 'admin', 'superadmin', 'coach']
const createRoles: UserRole[] = ['player', 'admin', 'coach']
const tingkatOptions = ['SMA', 'SMK', 'SMP']

interface CreateUserForm {
  full_name: string
  email: string
  password: string
  role: UserRole
  phone: string
  tingkat: string
}

interface EditUserForm {
  full_name: string
  email: string
  phone: string
  tingkat: string
}

const emptyCreateForm: CreateUserForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'player',
  phone: '',
  tingkat: '',
}

const emptyEditForm: EditUserForm = {
  full_name: '',
  email: '',
  phone: '',
  tingkat: '',
}

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [changeRole, setChangeRole] = useState<{
    user: User
    newRole: UserRole
  } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20

  // CRUD states
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>(emptyEditForm)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      let allUsers: User[] = []
      let page = 1
      let totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<User[]>(`/admin/users?per_page=100&page=${page}`)
        const pageData = Array.isArray(res.data) ? res.data : []
        allUsers = [...allUsers, ...pageData]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }
      setUsers(allUsers)
    } catch {
      toast.error('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleChangeRole() {
    if (!changeRole) return
    setProcessing(true)
    try {
      await api.put(`/admin/users/${changeRole.user.id}/role`, {
        role: changeRole.newRole,
      })
      toast.success(`Role ${changeRole.user.full_name} diubah ke ${roleLabels[changeRole.newRole]}`)
      setChangeRole(null)
      await loadData()
    } catch {
      toast.error('Gagal mengubah role')
    } finally {
      setProcessing(false)
    }
  }

  // Create user
  async function handleCreateUser() {
    if (!createForm.full_name || !createForm.email || !createForm.password) {
      toast.error('Nama, email, dan password wajib diisi')
      return
    }
    setProcessing(true)
    try {
      const payload: Record<string, string> = {
        full_name: createForm.full_name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      }
      if (createForm.phone) payload.phone = createForm.phone
      if (createForm.tingkat) payload.tingkat = createForm.tingkat
      await api.post('/admin/users', payload)
      toast.success(`Pengguna ${createForm.full_name} berhasil ditambahkan`)
      setShowCreate(false)
      setCreateForm(emptyCreateForm)
      await loadData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menambahkan pengguna'
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  // Edit user
  async function handleEditUser() {
    if (!editUser) return
    if (!editForm.full_name || !editForm.email) {
      toast.error('Nama dan email wajib diisi')
      return
    }
    setProcessing(true)
    try {
      const payload: Record<string, string> = {
        full_name: editForm.full_name,
        email: editForm.email,
      }
      if (editForm.phone) payload.phone = editForm.phone
      if (editForm.tingkat) payload.tingkat = editForm.tingkat
      await api.put(`/admin/users/${editUser.id}`, payload)
      toast.success(`Data ${editForm.full_name} berhasil diperbarui`)
      setEditUser(null)
      setEditForm(emptyEditForm)
      await loadData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui data pengguna'
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  // Delete user
  async function handleDeleteUser() {
    if (!deleteUser) return
    setProcessing(true)
    try {
      await api.delete(`/admin/users/${deleteUser.id}`)
      toast.success(`Pengguna ${deleteUser.full_name} berhasil dihapus`)
      setDeleteUser(null)
      setDeleteConfirmName('')
      await loadData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus pengguna'
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  // Reset password
  async function handleResetPassword() {
    if (!resetUser) return
    setProcessing(true)
    try {
      const result = await api.post<{ password: string }>(`/admin/users/${resetUser.id}/reset-password`)
      setGeneratedPassword(result.password)
      toast.success(`Password ${resetUser.full_name} berhasil direset`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mereset password'
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  function openEditDialog(user: User) {
    setEditUser(user)
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone ?? '',
      tingkat: user.tingkat ?? '',
    })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Password disalin ke clipboard')
    }).catch(() => {
      toast.error('Gagal menyalin password')
    })
  }

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
        title="Manajemen Pengguna"
        description="Kelola pengguna dan hak akses (Superadmin only)"
        actions={
          <div className="flex items-center gap-2">
            {users.length > 0 && (
              <ExportButton
                options={[
                  {
                    label: 'Export CSV',
                    type: 'csv',
                    onExport: () => {
                      const data = users.map((u) => ({
                        full_name: u.full_name,
                        email: u.email,
                        phone: u.phone ?? '-',
                        role: roleLabels[u.role],
                      }))
                      downloadCSV(data, 'users.csv', [
                        { key: 'full_name', header: 'Nama' },
                        { key: 'email', header: 'Email' },
                        { key: 'phone', header: 'Telepon' },
                        { key: 'role', header: 'Role' },
                      ])
                    },
                  },
                ]}
              />
            )}
            <Button
              onClick={() => { setCreateForm(emptyCreateForm); setShowCreate(true) }}
              className="bg-porjar-red hover:bg-porjar-red-dark text-white"
            >
              <Plus size={16} weight="bold" className="mr-1" />
              Tambah Pengguna
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          {(['all', ...availableRoles] as const).map((role) => (
            <button
              key={role}
              onClick={() => { setFilterRole(role); setCurrentPage(1) }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterRole === role
                  ? 'bg-porjar-red text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {role === 'all' ? 'Semua' : roleLabels[role]}
            </button>
          ))}
        </div>
        <Input
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
          className="w-full sm:w-56 bg-white border-stone-300 text-sm focus:border-porjar-red"
        />
      </div>

      {(() => {
        const filtered = users.filter((u) => {
          if (filterRole !== 'all' && u.role !== filterRole) return false
          if (search) {
            const q = search.toLowerCase()
            if (!u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
          }
          return true
        })
        const totalFiltered = filtered.length
        const totalPages = Math.ceil(totalFiltered / perPage)
        const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

        return <>
      {/* Total counter */}
      <div className="mb-4 text-sm text-stone-500">
        Menampilkan <span className="font-semibold text-stone-900">{totalFiltered}</span> dari <span className="font-semibold text-stone-900">{users.length}</span> pengguna
        {totalPages > 1 && <span className="text-stone-400"> · Halaman {currentPage} dari {totalPages}</span>}
      </div>

      {totalFiltered === 0 ? (
        <EmptyState icon={Users} title="Tidak Ada Pengguna" description="Tidak ada pengguna yang cocok dengan filter." />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Nama</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Email</TableHead>
                <TableHead className="hidden sm:table-cell text-stone-600 uppercase text-xs tracking-wider">Telepon</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Role</TableHead>
                <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((user) => (
                <TableRow key={user.id} className="border-stone-100 hover:bg-red-50/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle size={20} className="text-stone-400" />
                        )}
                      </div>
                      <span className="font-medium text-stone-900">{user.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">{user.email}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-stone-500">
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => openEditDialog(user)}
                        className="text-stone-500 hover:text-blue-600 h-7 w-7 p-0"
                        title="Edit pengguna"
                      >
                        <PencilSimple size={15} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setResetUser(user)}
                        className="text-stone-500 hover:text-amber-600 h-7 w-7 p-0"
                        title="Reset password"
                      >
                        <Key size={15} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => { setDeleteUser(user); setDeleteConfirmName('') }}
                        className="text-stone-500 hover:text-red-600 h-7 w-7 p-0"
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
                            onClick={() => setChangeRole({ user, newRole: role })}
                            className="text-stone-500 hover:text-stone-900 text-xs"
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
            <div className="flex flex-col gap-2 border-t border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">
                {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalFiltered)} dari {totalFiltered}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                      <span key={`dot-${i}`} className="px-1 text-xs text-stone-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                          currentPage === p
                            ? 'border-porjar-red bg-porjar-red text-white'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </>
      })()}

      {/* Confirm role change dialog */}
      <Dialog open={!!changeRole} onOpenChange={(open) => !open && setChangeRole(null)}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Ubah Role Pengguna</DialogTitle>
            <DialogDescription className="text-stone-500">
              Ubah role <strong className="text-stone-900">{changeRole?.user.full_name}</strong> dari{' '}
              <strong className="text-stone-900">{changeRole ? roleLabels[changeRole.user.role] : ''}</strong> menjadi{' '}
              <strong className="text-stone-900">{changeRole ? roleLabels[changeRole.newRole] : ''}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeRole(null)}
              className="border-stone-300 text-stone-600"
            >
              Batal
            </Button>
            <Button onClick={handleChangeRole} disabled={processing} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              {processing ? 'Memproses...' : 'Ya, Ubah Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false) }}>
        <DialogContent className="bg-white border-stone-200 text-stone-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Tambah Pengguna</DialogTitle>
            <DialogDescription className="text-stone-500">
              Buat akun pengguna baru untuk platform turnamen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Nama Lengkap <span className="text-red-500">*</span></label>
              <Input
                placeholder="Nama lengkap"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Email <span className="text-red-500">*</span></label>
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Password <span className="text-red-500">*</span></label>
              <Input
                type="password"
                placeholder="Minimal 8 karakter"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Role <span className="text-red-500">*</span></label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red"
              >
                {createRoles.map((r) => (
                  <option key={r} value={r}>{roleLabels[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Telepon</label>
              <Input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Tingkat</label>
              <select
                value={createForm.tingkat}
                onChange={(e) => setCreateForm((f) => ({ ...f, tingkat: e.target.value }))}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red"
              >
                <option value="">-- Pilih Tingkat --</option>
                {tingkatOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-stone-300 text-stone-600">
              Batal
            </Button>
            <Button onClick={handleCreateUser} disabled={processing} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              {processing ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) { setEditUser(null); setEditForm(emptyEditForm) } }}>
        <DialogContent className="bg-white border-stone-200 text-stone-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Edit Pengguna</DialogTitle>
            <DialogDescription className="text-stone-500">
              Perbarui informasi pengguna <strong className="text-stone-900">{editUser?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Nama Lengkap <span className="text-red-500">*</span></label>
              <Input
                placeholder="Nama lengkap"
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Email <span className="text-red-500">*</span></label>
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Telepon</label>
              <Input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Tingkat</label>
              <select
                value={editForm.tingkat}
                onChange={(e) => setEditForm((f) => ({ ...f, tingkat: e.target.value }))}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-porjar-red focus:outline-none focus:ring-1 focus:ring-porjar-red"
              >
                <option value="">-- Pilih Tingkat --</option>
                {tingkatOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditUser(null); setEditForm(emptyEditForm) }} className="border-stone-300 text-stone-600">
              Batal
            </Button>
            <Button onClick={handleEditUser} disabled={processing} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user dialog */}
      <Dialog open={!!deleteUser && !generatedPassword} onOpenChange={(open) => { if (!open) { setDeleteUser(null); setDeleteConfirmName('') } }}>
        <DialogContent className="bg-white border-stone-200 text-stone-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Pengguna</DialogTitle>
            <DialogDescription className="text-stone-500">
              Yakin hapus user <strong className="text-stone-900">{deleteUser?.full_name}</strong>? Data tim terkait juga akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-stone-600">
              Ketik <strong className="text-stone-900 font-mono bg-stone-100 px-1 py-0.5 rounded">{deleteUser?.full_name}</strong> untuk mengonfirmasi penghapusan.
            </p>
            <Input
              placeholder="Ketik nama pengguna untuk konfirmasi"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="bg-white border-stone-300 focus:border-red-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteUser(null); setDeleteConfirmName('') }} className="border-stone-300 text-stone-600">
              Batal
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={processing || deleteConfirmName !== deleteUser?.full_name}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
            >
              {processing ? 'Menghapus...' : 'Hapus Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null)
            setGeneratedPassword(null)
            setShowPassword(false)
          }
        }}
      >
        <DialogContent className="bg-white border-stone-200 text-stone-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-900">
              {generatedPassword ? 'Password Baru' : 'Reset Password'}
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              {generatedPassword
                ? <>Password baru untuk <strong className="text-stone-900">{resetUser?.full_name}</strong>. Salin sekarang, password ini hanya ditampilkan sekali.</>
                : <>Reset password user <strong className="text-stone-900">{resetUser?.full_name}</strong>? Password baru akan dibuat secara otomatis.</>
              }
            </DialogDescription>
          </DialogHeader>

          {generatedPassword ? (
            <div className="py-2">
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <code className="flex-1 font-mono text-sm text-stone-900 select-all">
                  {showPassword ? generatedPassword : '••••••••••••'}
                </code>
                <button
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded p-1 text-stone-500 hover:text-stone-700 hover:bg-amber-100 transition-colors"
                  title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(generatedPassword)}
                  className="rounded p-1 text-stone-500 hover:text-stone-700 hover:bg-amber-100 transition-colors"
                  title="Salin password"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-600">
                Password ini hanya ditampilkan sekali. Pastikan sudah disalin sebelum menutup dialog.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            {generatedPassword ? (
              <Button
                onClick={() => { setResetUser(null); setGeneratedPassword(null); setShowPassword(false) }}
                className="bg-porjar-red hover:bg-porjar-red-dark text-white"
              >
                Tutup
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResetUser(null)} className="border-stone-300 text-stone-600">
                  Batal
                </Button>
                <Button onClick={handleResetPassword} disabled={processing} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {processing ? 'Mereset...' : 'Ya, Reset Password'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
