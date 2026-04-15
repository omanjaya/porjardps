'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Shuffle, Trophy, CheckCircle, Users,
} from '@phosphor-icons/react'
import { ExportButton } from '@/components/shared/ExportButton'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import type { TournamentGroup, GroupMatch } from '@/types'

import { useGroupManagement } from './hooks/useGroupManagement'
import { useAutoDrawGroup } from './hooks/useAutoDrawGroup'
import { GroupCard } from './components/GroupCard'
import { GroupMatchSheetContent } from './components/GroupMatchSheetContent'
import { CreateGroupDialog } from './dialogs/CreateGroupDialog'
import { EditGroupDialog } from './dialogs/EditGroupDialog'
import { AddTeamsDialog } from './dialogs/AddTeamsDialog'
import { ConfirmActionDialog } from './dialogs/ConfirmActionDialog'
import { AutoDrawDialog } from './dialogs/AutoDrawDialog'

export default function AdminGroupsPage() {
  const params = useParams<{ id: string }>()
  const gm = useGroupManagement(params.id)
  const {
    tournament, groups, loading, availableTeams, groupMatches, groupStandings,
    expandedGroups, operating, advancing,
    loadData, toggleGroup,
    createGroup, editGroup, deleteGroupAction, addTeamsToGroup, removeTeam,
    generateMatches, updateScore, setPenalty, setMatchLive, setAllLive,
    resetGroupResults, resetMatchSubmissions, advancePlayoff,
  } = gm

  const autoDraw = useAutoDrawGroup(params.id, availableTeams, loadData)

  // Create group dialog state
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupOrder, setNewGroupOrder] = useState(1)
  const [newAdvanceCount, setNewAdvanceCount] = useState(2)
  const [newGroupLegs, setNewGroupLegs] = useState(1)
  const [creating, setCreating] = useState(false)

  // Add teams dialog state
  const [showAddTeams, setShowAddTeams] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [addingTeams, setAddingTeams] = useState(false)

  // Edit group dialog state
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editGroupId, setEditGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editAdvanceCount, setEditAdvanceCount] = useState(2)
  const [saving, setSaving] = useState(false)

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ message: string; action: () => void } | null>(null)

  // Submission sheet
  const [submissionMatch, setSubmissionMatch] = useState<GroupMatch | null>(null)

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    setCreating(true)
    const ok = await createGroup({
      name: newGroupName.trim(),
      group_order: newGroupOrder,
      advance_count: newAdvanceCount,
      legs: newGroupLegs,
    })
    setCreating(false)
    if (ok) { setShowCreate(false); setNewGroupName('') }
  }

  const openEditGroup = (group: TournamentGroup) => {
    setEditGroupId(group.id)
    setEditGroupName(group.name)
    setEditAdvanceCount(group.advance_count)
    setShowEditGroup(true)
  }

  const handleEditGroup = async () => {
    if (!editGroupId || !editGroupName.trim()) return
    setSaving(true)
    const ok = await editGroup(editGroupId, { name: editGroupName.trim(), advance_count: editAdvanceCount })
    setSaving(false)
    if (ok) setShowEditGroup(false)
  }

  const handleAddTeams = async () => {
    if (!activeGroupId || selectedTeamIds.length === 0) return
    setAddingTeams(true)
    const ok = await addTeamsToGroup(activeGroupId, selectedTeamIds)
    setAddingTeams(false)
    if (ok) { setShowAddTeams(false); setSelectedTeamIds([]) }
  }

  const handleDeleteGroup = (groupId: string) => {
    setConfirmAction({
      message: 'Hapus grup ini beserta semua data pertandingan?',
      action: () => deleteGroupAction(groupId),
    })
  }

  const handleGenerateMatches = (groupId: string) => {
    setConfirmAction({
      message: 'Generate pertandingan round robin? Pertandingan lama akan dihapus.',
      action: () => generateMatches(groupId),
    })
  }

  const handleAdvancePlayoff = () => {
    setConfirmAction({
      message: 'Generate bracket playoff dari hasil grup? Bracket lama akan dihapus.',
      action: () => advancePlayoff(),
    })
  }

  const handleOpenAddTeams = (groupId: string) => {
    setActiveGroupId(groupId); setSelectedTeamIds([]); setShowAddTeams(true)
  }

  const handleConfirm = (message: string, action: () => void) => {
    setConfirmAction({ message, action })
  }

  function exportCSV() {
    const rows = ['Grup,Posisi,Tim,M,W,D,L,SM,SK,SS,Penalti,Poin']
    for (const group of groups) {
      const standings = groupStandings[group.id] ?? []
      standings.forEach((s, i) => {
        rows.push(`"${group.name}",${i + 1},"${s.team?.name ?? 'Unknown'}",${s.matches_played},${s.wins},${s.draws},${s.losses},${s.goals_for},${s.goals_against},${s.goal_difference},${s.penalty_points},${s.points}`)
      })
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `klasemen-grup-${tournament?.name ?? 'group'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    try {
      const blob = await api.getBlob(`/admin/tournaments/${params.id}/groups/export-pdf`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `klasemen-grup-${tournament?.name ?? 'group'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal export PDF')
    }
  }

  const allMatchesComplete = groups.length > 0 && groups.every(g => {
    const m = groupMatches[g.id] ?? []; return m.length > 0 && m.every(x => x.status === 'completed')
  })
  const groupOnlyFormat = groups.length > 0 && groups.every(g => g.advance_count === 0)

  const assignedTeamIds = new Set(groups.flatMap(g => (g.teams ?? []).map(t => t.id)))
  const unassignedTeams = availableTeams.filter(t => !assignedTeamIds.has(t.id))

  const totalTeams = new Set(groups.flatMap(g => (g.teams ?? []).map(t => t.id))).size
  const totalMatches = Object.values(groupMatches).flat().length
  const completedMatches = Object.values(groupMatches).flat().filter(m => m.status === 'completed').length

  if (loading) return (
    <>
      <Skeleton className="h-10 w-64 bg-stone-200" />
      <div className="mt-4 grid gap-4 sm:grid-cols-3"><Skeleton className="h-20 bg-stone-200" /><Skeleton className="h-20 bg-stone-200" /><Skeleton className="h-20 bg-stone-200" /></div>
      <Skeleton className="mt-4 h-96 w-full bg-stone-200" />
    </>
  )

  return (
    <>
      <PageHeader
        title="Fase Grup"
        description={tournament?.name}
        breadcrumbs={[
          { label: 'Turnamen', href: '/admin/tournaments' },
          { label: tournament?.name ?? '', href: `/admin/tournaments/${params.id}` },
          { label: 'Grup' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {groups.length > 0 && Object.values(groupStandings).some(s => s.length > 0) && (
              <ExportButton options={[
                { label: 'Export CSV', type: 'csv', onExport: exportCSV },
                { label: 'Export PDF', type: 'pdf', onExport: exportPDF },
              ]} />
            )}
            <Button variant="outline" size="sm" onClick={() => autoDraw.setShowAutoDraw(true)}>
              <Shuffle className="mr-1.5 h-4 w-4" /> Acak Grup
            </Button>
            {allMatchesComplete && !groupOnlyFormat && (
              <Button size="sm" onClick={handleAdvancePlayoff} disabled={advancing || operating} className="bg-green-600 hover:bg-green-700 text-white">
                <Trophy className="mr-1.5 h-4 w-4" /> {advancing ? 'Processing...' : 'Advance ke Playoff'}
              </Button>
            )}
            {allMatchesComplete && groupOnlyFormat && (
              <span className="text-xs text-stone-400 dark:text-zinc-500 italic">Format grup saja — tidak ada fase playoff</span>
            )}
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-esi-red hover:bg-esi-red/90">
              <Plus className="mr-1.5 h-4 w-4" /> Buat Grup
            </Button>
          </div>
        }
      />

      {groups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">{groups.length}</p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Grup</p>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">{totalTeams}</p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Tim</p>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">{completedMatches}<span className="text-sm font-normal text-stone-400 dark:text-zinc-500">/{totalMatches}</span></p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Match Selesai</p>
          </div>
          <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-stone-900 dark:text-zinc-100">{groups.reduce((s, g) => s + g.advance_count, 0)}</p>
              {allMatchesComplete && <CheckCircle size={18} weight="fill" className="text-green-500" />}
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400">Total Lolos Playoff</p>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
          <Users size={48} className="mx-auto mb-3 text-stone-300 dark:text-zinc-600" />
          <p className="text-lg font-semibold text-stone-700 dark:text-zinc-300">Belum ada grup</p>
          <p className="text-sm text-stone-400 dark:text-zinc-500 mt-1 mb-4">Acak tim ke dalam grup atau buat grup manual</p>
          <Button onClick={() => autoDraw.setShowAutoDraw(true)} className="bg-esi-red hover:bg-esi-red/90">
            <Shuffle className="mr-1.5 h-4 w-4" /> Acak Grup Otomatis
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              matches={groupMatches[group.id] ?? []}
              standings={groupStandings[group.id] ?? []}
              expanded={expandedGroups.has(group.id)}
              operating={operating}
              onToggle={toggleGroup}
              onAddTeams={handleOpenAddTeams}
              onGenerate={handleGenerateMatches}
              onSetAllLive={setAllLive}
              onResetGroupResults={resetGroupResults}
              onEdit={openEditGroup}
              onDelete={handleDeleteGroup}
              onRemoveTeam={removeTeam}
              onPenalty={setPenalty}
              onUpdateScore={updateScore}
              onSetMatchLive={setMatchLive}
              onResetMatchSubmissions={resetMatchSubmissions}
              onViewSubmissions={setSubmissionMatch}
              onConfirm={handleConfirm}
            />
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        name={newGroupName}
        setName={setNewGroupName}
        order={newGroupOrder}
        setOrder={setNewGroupOrder}
        advanceCount={newAdvanceCount}
        setAdvanceCount={setNewAdvanceCount}
        legs={newGroupLegs}
        setLegs={setNewGroupLegs}
        creating={creating}
        onCreate={handleCreateGroup}
      />

      <AddTeamsDialog
        open={showAddTeams}
        onOpenChange={setShowAddTeams}
        unassignedTeams={unassignedTeams}
        selectedTeamIds={selectedTeamIds}
        setSelectedTeamIds={setSelectedTeamIds}
        addingTeams={addingTeams}
        onAdd={handleAddTeams}
      />

      <ConfirmActionDialog
        action={confirmAction}
        onClose={() => setConfirmAction(null)}
      />

      <EditGroupDialog
        open={showEditGroup}
        onOpenChange={setShowEditGroup}
        name={editGroupName}
        setName={setEditGroupName}
        advanceCount={editAdvanceCount}
        setAdvanceCount={setEditAdvanceCount}
        saving={saving}
        onSave={handleEditGroup}
      />

      <AutoDrawDialog
        open={autoDraw.showAutoDraw}
        onOpenChange={autoDraw.setShowAutoDraw}
        availableTeams={availableTeams}
        numGroups={autoDraw.numGroups}
        setNumGroups={autoDraw.setNumGroups}
        advancePerGroup={autoDraw.advancePerGroup}
        setAdvancePerGroup={autoDraw.setAdvancePerGroup}
        autoDrawLegs={autoDraw.autoDrawLegs}
        setAutoDrawLegs={autoDraw.setAutoDrawLegs}
        drawing={autoDraw.drawing}
        drawPhase={autoDraw.drawPhase}
        shuffleDisplay={autoDraw.shuffleDisplay}
        onAutoDraw={autoDraw.handleAutoDraw}
      />

      <Sheet open={!!submissionMatch} onOpenChange={(open) => !open && setSubmissionMatch(null)}>
        <SheetContent side="right" className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 overflow-y-auto sm:max-w-md w-full">
          <SheetHeader className="border-b border-stone-200 dark:border-zinc-700 pb-4">
            <SheetTitle className="text-stone-900 dark:text-zinc-100">
              Detail Match
            </SheetTitle>
            {submissionMatch && (
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Round {submissionMatch.round} &middot; {submissionMatch.status === 'completed' ? 'Selesai' : submissionMatch.status === 'live' ? 'LIVE' : 'Menunggu'}
              </p>
            )}
          </SheetHeader>
          <div className="p-4 space-y-6">
            {submissionMatch && (
              <GroupMatchSheetContent
                match={submissionMatch}
                groupId={groups.find(g => (g.matches ?? []).some(m => m.id === submissionMatch.id))?.id ?? ''}
                onScoreSaved={() => { loadData(); setSubmissionMatch(null) }}
                onVerified={() => loadData()}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
