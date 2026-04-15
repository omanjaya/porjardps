'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { ExportButton } from '@/components/shared/ExportButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import type { School, SchoolLevel } from '@/types'

import { useSchoolCrud, type SchoolFormData } from './hooks/useSchoolCrud'
import { useSchoolRequests } from './hooks/useSchoolRequests'
import { SchoolFilterBar } from './components/SchoolFilterBar'
import { SchoolRequestsSection } from './components/SchoolRequestsSection'
import { SchoolsTable } from './components/SchoolsTable'
import { SchoolFormDialog } from './dialogs/SchoolFormDialog'
import { RejectSchoolRequestDialog } from './dialogs/RejectSchoolRequestDialog'

export default function AdminSchoolsPage() {
  const {
    schools,
    teams,
    schoolRequests,
    loading,
    submitting,
    assigningTeamId,
    loadData,
    saveSchool,
    deleteSchool,
    assignTeam,
  } = useSchoolCrud()

  const requests = useSchoolRequests(loadData)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')

  const [filterLevel, setFilterLevel] = useState<SchoolLevel | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (filterLevel !== 'all' && s.level !== filterLevel) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [schools, filterLevel, search])

  function openCreate() {
    setMode('create')
    setEditingSchool(null)
    setDialogOpen(true)
  }

  function openEdit(school: School) {
    setMode('edit')
    setEditingSchool(school)
    setDialogOpen(true)
  }

  async function handleSubmit(form: SchoolFormData): Promise<boolean> {
    return saveSchool(form, mode === 'edit' ? editingSchool?.id ?? null : null)
  }

  async function handleExportCSV() {
    try {
      const blob = await api.getBlob('/admin/export/schools.csv')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schools-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal export')
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
          <div className="flex items-center gap-2">
            {schools.length > 0 && (
              <ExportButton
                options={[
                  { label: 'Export CSV', type: 'csv', onExport: handleExportCSV },
                ]}
              />
            )}
            <Button onClick={openCreate} className="bg-esi-red hover:bg-esi-red-dark text-white">
              <Plus size={16} className="mr-1" />
              Tambah Sekolah
            </Button>
          </div>
        }
      />

      <SchoolRequestsSection
        requests={schoolRequests}
        approvingId={requests.approvingId}
        onApprove={requests.approveRequest}
        onReject={requests.openReject}
      />

      <RejectSchoolRequestDialog
        open={requests.rejectDialogOpen}
        onOpenChange={requests.setRejectDialogOpen}
        reason={requests.rejectReason}
        onReasonChange={requests.setRejectReason}
        onConfirm={requests.rejectRequest}
        submitting={requests.submittingReject}
      />

      <SchoolFilterBar
        filterLevel={filterLevel}
        onFilterLevel={setFilterLevel}
        search={search}
        onSearch={setSearch}
      />

      <SchoolsTable
        schools={filtered}
        teams={teams}
        totalSchools={schools.length}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deleteSchool}
        onAssignTeam={assignTeam}
        assigningTeamId={assigningTeamId}
        resetPageKey={`${filterLevel}|${search}`}
      />

      <SchoolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        school={editingSchool}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </AdminLayout>
  )
}
