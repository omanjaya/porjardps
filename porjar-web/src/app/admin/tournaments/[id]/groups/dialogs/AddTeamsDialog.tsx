'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import type { TeamSummary } from '@/types'

interface AddTeamsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unassignedTeams: TeamSummary[]
  selectedTeamIds: string[]
  setSelectedTeamIds: (fn: (prev: string[]) => string[]) => void
  addingTeams: boolean
  onAdd: () => void
}

export function AddTeamsDialog({
  open, onOpenChange, unassignedTeams, selectedTeamIds, setSelectedTeamIds, addingTeams, onAdd,
}: AddTeamsDialogProps) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd()
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Tim ke Grup"
      onSubmit={handleSubmit}
      submitting={addingTeams}
      submitDisabled={selectedTeamIds.length === 0}
      submitLabel={`Tambah ${selectedTeamIds.length} Tim`}
    >
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {unassignedTeams.length === 0 ? (
          <p className="text-center text-sm text-stone-400 dark:text-zinc-500 py-4">Semua tim sudah masuk grup</p>
        ) : unassignedTeams.map((team) => (
          <label key={team.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 dark:border-zinc-700 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 transition-colors">
            <input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={(e) => {
              if (e.target.checked) setSelectedTeamIds(p => [...p, team.id])
              else setSelectedTeamIds(p => p.filter(id => id !== team.id))
            }} className="h-4 w-4 rounded border-stone-300 dark:border-zinc-600 accent-esi-red" />
            <span className="text-sm font-medium text-stone-700 dark:text-zinc-300">{team.name}</span>
          </label>
        ))}
      </div>
    </FormDialog>
  )
}
