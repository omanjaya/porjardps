'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { GraduationCap, Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import type { School, SchoolLevel } from '@/types'

interface SchoolFormData {
  name: string
  level: SchoolLevel
  address: string
  city: string
}

const emptyForm: SchoolFormData = {
  name: '',
  level: 'SMA',
  address: '',
  city: 'Denpasar',
}

const levelOptions: SchoolLevel[] = ['SMP', 'SMA', 'SMK']

export default function AdminSchoolsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SchoolFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [filterLevel, setFilterLevel] = useState<SchoolLevel | 'all'>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      let allSchools: School[] = []
      let page = 1
      let totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<School[]>(`/admin/schools?per_page=100&page=${page}`)
        const pageData = Array.isArray(res.data) ? res.data : []
        allSchools = [...allSchools, ...pageData]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }
      setSchools(allSchools)
    } catch {
      toast.error('Gagal memuat data sekolah')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(school: School) {
    setEditingId(school.id)
    setForm({
      name: school.name,
      level: school.level,
      address: school.address ?? '',
      city: school.city,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Nama sekolah wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/admin/schools/${editingId}`, form)
        toast.success('Sekolah berhasil diperbarui')
      } else {
        await api.post('/admin/schools', form)
        toast.success('Sekolah berhasil ditambahkan')
      }
      setDialogOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan sekolah')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/schools/${id}`)
      toast.success('Sekolah berhasil dihapus')
      await loadData()
    } catch {
      toast.error('Gagal menghapus sekolah')
    }
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
        title="Manajemen Sekolah"
        description="Kelola data sekolah peserta"
        actions={
          <Button onClick={openCreate} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
            <Plus size={16} className="mr-1" />
            Tambah Sekolah
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          {(['all', ...levelOptions] as const).map((level) => (
            <button
              key={level}
              onClick={() => { setFilterLevel(level); setCurrentPage(1) }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterLevel === level
                  ? 'bg-porjar-red text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {level === 'all' ? 'Semua' : level}
            </button>
          ))}
        </div>
        <Input
          placeholder="Cari sekolah..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
          className="w-48 bg-white border-stone-300 text-sm focus:border-porjar-red"
        />
      </div>

      {(() => {
        const filtered = schools.filter((s) => {
          if (filterLevel !== 'all' && s.level !== filterLevel) return false
          if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
          return true
        })
        const totalFiltered = filtered.length
        const totalPages = Math.ceil(totalFiltered / perPage)
        const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

        return <>
      {/* Total counter */}
      <div className="mb-4 text-sm text-stone-500">
        Menampilkan <span className="font-semibold text-stone-900">{totalFiltered}</span> dari <span className="font-semibold text-stone-900">{schools.length}</span> sekolah
        {totalPages > 1 && <span className="text-stone-400"> · Halaman {currentPage} dari {totalPages}</span>}
      </div>

      {totalFiltered === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Belum Ada Sekolah"
          description="Tambahkan sekolah peserta."
          actionLabel="Tambah Sekolah"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-200 hover:bg-transparent bg-stone-50">
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Nama Sekolah</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Jenjang</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Alamat</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Kota</TableHead>
                <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((school) => (
                <TableRow key={school.id} className="border-stone-100 hover:bg-red-50/50">
                  <TableCell>
                    <span className="font-medium text-stone-900">{school.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      {school.level}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">
                    {school.address ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">{school.city}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => openEdit(school)}
                        className="text-stone-500 hover:text-stone-900"
                      >
                        <PencilSimple size={14} />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(school.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
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

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-stone-900">
              {editingId ? 'Edit Sekolah' : 'Tambah Sekolah'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Nama Sekolah</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="SMAN 1 Denpasar"
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Jenjang</label>
              <div className="flex gap-2">
                {levelOptions.map((level) => (
                  <button
                    key={level}
                    onClick={() => setForm((f) => ({ ...f, level }))}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.level === level
                        ? 'bg-porjar-red text-white'
                        : 'bg-stone-100 text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Alamat</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Jl. Kamboja No. 1"
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Kota</label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Denpasar"
                className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-stone-300 text-stone-600"
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              {submitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
