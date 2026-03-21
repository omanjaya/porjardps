'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { GraduationCap, Plus, PencilSimple, Trash, CaretDown, CaretRight, Image as ImageIcon } from '@phosphor-icons/react'
import type { School, SchoolLevel, Team } from '@/types'

interface SchoolFormData {
  name: string
  level: SchoolLevel
  address: string
  city: string
  logo_url: string
}

const emptyForm: SchoolFormData = {
  name: '',
  level: 'SMA',
  address: '',
  city: 'Denpasar',
  logo_url: '',
}

const levelOptions: SchoolLevel[] = ['SMP', 'SMA', 'SMK']

export default function AdminSchoolsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [schools, setSchools] = useState<School[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SchoolFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [filterLevel, setFilterLevel] = useState<SchoolLevel | 'all'>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const perPage = 20

  const loadData = useCallback(async () => {
    if (!isAuthenticated || authLoading) return
    try {
      // Fetch all schools
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

      // Fetch all teams
      let allTeams: Team[] = []
      page = 1
      totalPages = 1
      while (page <= totalPages) {
        const res = await api.getPaginated<Team[]>(`/teams?per_page=100&page=${page}`)
        const pageData = Array.isArray(res.data) ? res.data : []
        allTeams = [...allTeams, ...pageData]
        totalPages = res.meta?.total_pages ?? 1
        page++
      }
      setTeams(allTeams)
    } catch {
      toast.error('Gagal memuat data sekolah')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    loadData()
  }, [loadData])

  function getTeamsForSchool(schoolId: string): Team[] {
    return teams.filter((t) => t.school?.id === schoolId)
  }

  function toggleExpand(schoolId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(schoolId)) {
        next.delete(schoolId)
      } else {
        next.add(schoolId)
      }
      return next
    })
  }

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
      logo_url: school.logo_url ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Nama sekolah wajib diisi')
      return
    }

    // Duplicate detection (warn only, don't block)
    if (!editingId) {
      const duplicate = schools.find(
        (s) =>
          s.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
          s.level === form.level
      )
      if (duplicate) {
        toast.warning('Sekolah dengan nama dan jenjang ini sudah ada')
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        level: form.level,
        address: form.address,
        city: form.city,
        logo_url: form.logo_url || null,
      }
      if (editingId) {
        await api.put(`/admin/schools/${editingId}`, payload)
        toast.success('Sekolah berhasil diperbarui')
      } else {
        await api.post('/admin/schools', payload)
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
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider w-8" />
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Logo</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider whitespace-nowrap">Nama Sekolah</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Jenjang</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Tim</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Alamat</TableHead>
                <TableHead className="text-stone-600 uppercase text-xs tracking-wider">Kota</TableHead>
                <TableHead className="text-right text-stone-600 uppercase text-xs tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((school) => {
                const schoolTeams = getTeamsForSchool(school.id)
                const isExpanded = expandedIds.has(school.id)

                return (
                  <Fragment key={school.id}>
                    <TableRow
                      className="border-stone-100 hover:bg-red-50/50 cursor-pointer"
                      onClick={() => toggleExpand(school.id)}
                    >
                      <TableCell className="w-8 px-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(school.id) }}
                          className="p-0.5 rounded hover:bg-stone-200 text-stone-400 transition-colors"
                        >
                          {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                        </button>
                      </TableCell>
                      <TableCell className="w-10">
                        {school.logo_url ? (
                          <img
                            src={school.logo_url}
                            alt={school.name}
                            className="h-8 w-8 rounded-md object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-100 border border-stone-200">
                            <GraduationCap size={16} className="text-stone-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-stone-900">{school.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                          {school.level}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          schoolTeams.length > 0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-stone-100 text-stone-400'
                        }`}>
                          {schoolTeams.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-stone-500">
                        {school.address ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-stone-500">{school.city}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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

                    {/* Expanded row: team list + coach phone */}
                    {isExpanded && (
                      <TableRow key={`${school.id}-expanded`} className="hover:bg-transparent">
                        <TableCell colSpan={8} className="p-0">
                          <div className="border-l-2 border-porjar-red/30 bg-stone-50 px-6 py-3 ml-4">
                            {/* Coach phone */}
                            {school.coach_phone && (
                              <p className="mb-2 text-xs text-stone-500">
                                <span className="font-medium text-stone-600">Telepon Pembina:</span>{' '}
                                {school.coach_phone}
                              </p>
                            )}

                            {/* Teams */}
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                              Tim Terdaftar ({schoolTeams.length})
                            </p>
                            {schoolTeams.length === 0 ? (
                              <p className="text-xs text-stone-400 italic">Belum ada tim terdaftar</p>
                            ) : (
                              <div className="space-y-1.5">
                                {schoolTeams.map((team) => (
                                  <div
                                    key={team.id}
                                    className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 border border-stone-100"
                                  >
                                    <span className="text-sm font-medium text-stone-800">{team.name}</span>
                                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                                      {team.game?.name ?? '-'}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                      {team.member_count} anggota
                                    </span>
                                    <StatusBadge status={team.status} className="text-[10px] px-1.5 py-0" />
                                  </div>
                                ))}
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
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Logo URL</label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.logo_url}
                  onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                  placeholder="/images/schools/sman1-denpasar.webp"
                  className="bg-white border-stone-300 text-stone-900 focus:border-porjar-red focus:ring-porjar-red/20"
                />
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Preview"
                    className="h-8 w-8 shrink-0 rounded-md border border-stone-200 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 border border-stone-200">
                    <ImageIcon size={14} className="text-stone-400" />
                  </div>
                )}
              </div>
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
