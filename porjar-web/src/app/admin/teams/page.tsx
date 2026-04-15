'use client'

import { useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton } from '@/components/shared/ExportButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, CheckCircle, XCircle, Plus } from '@phosphor-icons/react'
import { downloadCSV } from '@/lib/csv'

import { usePaginatedTeams } from './hooks/usePaginatedTeams'
import { useTeamCrud } from './hooks/useTeamCrud'
import { useBulkTeamOps } from './hooks/useBulkTeamOps'
import { usePlayerAssignment } from './hooks/usePlayerAssignment'
import { TeamFilterBar } from './components/TeamFilterBar'
import { TeamsTable } from './components/TeamsTable'
import { TeamDetailSheet } from './components/TeamDetailSheet'
import { CreateTeamDialog } from './dialogs/CreateTeamDialog'
import { EditTeamDialog } from './dialogs/EditTeamDialog'
import { BulkActionDialog } from './dialogs/BulkActionDialog'

export default function AdminTeamsPage() {
  const paged = usePaginatedTeams()
  const crud = useTeamCrud(paged.loadData)
  const bulk = useBulkTeamOps(paged.loadData)
  const assign = usePlayerAssignment()

  useEffect(() => {
    bulk.clearSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged.activeGame, paged.statusFilter])

  const totalFiltered = paged.totalTeams
  const pendingOnPage = bulk.pendingOnPage(paged.teams)
  const allPendingSelected = bulk.isAllPendingSelected(paged.teams)

  if (paged.loading) {
    return (
      <>
        <Skeleton className="h-10 w-64 bg-stone-200" />
        <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Manajemen Tim"
        description="Kelola dan approve pendaftaran tim"
        actions={
          <div className="flex items-center gap-2">
            {paged.teams.length > 0 && (
              <ExportButton
                options={[
                  {
                    label: 'Export CSV',
                    type: 'csv',
                    onExport: () => {
                      const data = paged.teams.map((t) => ({
                        name: t.name,
                        game: t.game.name,
                        school: t.school?.name ?? '-',
                        status: t.status,
                        member_count: t.member_count,
                      }))
                      downloadCSV(data, 'teams.csv', [
                        { key: 'name', header: 'Nama Tim' },
                        { key: 'game', header: 'Game' },
                        { key: 'school', header: 'Sekolah' },
                        { key: 'status', header: 'Status' },
                        { key: 'member_count', header: 'Jumlah Anggota' },
                      ])
                    },
                  },
                ]}
              />
            )}
            <Button size="sm" onClick={() => crud.setCreateOpen(true)} className="bg-esi-red hover:bg-red-700">
              <Plus size={16} className="mr-1" />
              Tambah Tim
            </Button>
          </div>
        }
      />

      <TeamFilterBar
        statusFilter={paged.statusFilter}
        onStatusChange={paged.setStatusFilter}
        games={paged.games}
        activeGame={paged.activeGame}
        onGameChange={paged.setActiveGame}
      />

      {bulk.selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 px-3 sm:px-4 py-2.5 shadow-sm">
          <span className="flex-1 text-sm font-medium text-stone-700 dark:text-zinc-300">
            {bulk.selectedIds.size} tim dipilih
          </span>
          <Button size="xs" onClick={() => bulk.handleBulkAction('approve')} disabled={bulk.bulkProcessing} className="bg-green-600 hover:bg-green-700">
            <CheckCircle size={14} className="mr-1" />
            {bulk.bulkProcessing ? 'Memproses...' : 'Approve Semua'}
          </Button>
          <Button size="xs" variant="destructive" onClick={() => bulk.handleBulkAction('reject')} disabled={bulk.bulkProcessing}>
            <XCircle size={14} className="mr-1" />
            {bulk.bulkProcessing ? 'Memproses...' : 'Reject Semua'}
          </Button>
          <Button size="xs" variant="outline" onClick={() => bulk.clearSelection()} disabled={bulk.bulkProcessing} className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400">
            Batal
          </Button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 text-sm text-stone-500 dark:text-zinc-400">
        <span>Menampilkan <span className="font-semibold text-stone-900 dark:text-zinc-100">{totalFiltered}</span> dari <span className="font-semibold text-stone-900 dark:text-zinc-100">{paged.teams.length}</span> tim</span>
        {paged.totalPages > 1 && <span className="text-stone-400 dark:text-zinc-500">· Halaman {paged.currentPage} dari {paged.totalPages}</span>}
      </div>

      {totalFiltered === 0 ? (
        <EmptyState icon={Users} title="Tidak Ada Tim" description="Tidak ada tim yang cocok dengan filter." />
      ) : (
        <TeamsTable
          teams={paged.teams}
          selectedIds={bulk.selectedIds}
          pendingOnPage={pendingOnPage}
          allPendingSelected={allPendingSelected}
          onToggleAll={() => bulk.toggleSelectAll(paged.teams)}
          onToggleOne={bulk.toggleSelectOne}
          onView={assign.openDetail}
          onEdit={(team) => { crud.setEditTeam(team); crud.setEditName(team.name) }}
          onConfirm={crud.setConfirmAction}
          onInlineStatusChange={crud.handleInlineStatusChange}
          inlineStatusLoading={crud.inlineStatusLoading}
          currentPage={paged.currentPage}
          totalPages={paged.totalPages}
          perPage={paged.perPage}
          totalFiltered={totalFiltered}
          onPageChange={paged.setCurrentPage}
        />
      )}

      <BulkActionDialog
        confirmAction={crud.confirmAction}
        onOpenChange={() => crud.setConfirmAction(null)}
        processing={crud.processing}
        onConfirm={crud.handleAction}
      />

      <CreateTeamDialog
        open={crud.createOpen}
        onOpenChange={crud.setCreateOpen}
        form={crud.createForm}
        setForm={crud.setCreateForm}
        loading={crud.createLoading}
        onSubmit={crud.handleCreate}
        games={paged.games}
        schools={paged.schools}
      />

      <EditTeamDialog
        editTeam={crud.editTeam}
        onOpenChange={() => crud.setEditTeam(null)}
        editName={crud.editName}
        setEditName={crud.setEditName}
        loading={crud.editLoading}
        onSubmit={crud.handleEdit}
      />

      <TeamDetailSheet
        open={assign.detailOpen}
        onOpenChange={assign.setDetailOpen}
        detailTeam={assign.detailTeam}
        detailLoading={assign.detailLoading}
        playerSearch={assign.playerSearch}
        setPlayerSearch={assign.setPlayerSearch}
        playerResults={assign.playerResults}
        playerSearchLoading={assign.playerSearchLoading}
        showUnassigned={assign.showUnassigned}
        setShowUnassigned={assign.setShowUnassigned}
        selectedPlayer={assign.selectedPlayer}
        setSelectedPlayer={assign.setSelectedPlayer}
        assignForm={assign.assignForm}
        setAssignForm={assign.setAssignForm}
        assignLoading={assign.assignLoading}
        onSearchPlayers={assign.searchPlayers}
        onAssignPlayer={assign.handleAssignPlayer}
        onRemoveMember={assign.handleRemoveMember}
      />
    </>
  )
}
