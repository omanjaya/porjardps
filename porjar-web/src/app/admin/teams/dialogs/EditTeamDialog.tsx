'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import type { Team } from '@/types'

interface Props {
  editTeam: Team | null
  onOpenChange: (open: boolean) => void
  editName: string
  setEditName: (s: string) => void
  loading: boolean
  onSubmit: () => void
}

export function EditTeamDialog({ editTeam, onOpenChange, editName, setEditName, loading, onSubmit }: Props) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <FormDialog
      open={!!editTeam}
      onOpenChange={(open) => !open && onOpenChange(false)}
      title="Edit Tim"
      description={`Ubah nama tim "${editTeam?.name ?? ''}".`}
      onSubmit={handleSubmit}
      submitting={loading}
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-700 dark:text-zinc-300">Nama Tim</label>
        <Input
          placeholder="Nama tim (3-50 karakter)"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="border-stone-300 dark:border-zinc-600"
        />
      </div>
    </FormDialog>
  )
}
