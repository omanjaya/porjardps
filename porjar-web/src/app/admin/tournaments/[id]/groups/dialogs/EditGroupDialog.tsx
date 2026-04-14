'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'

interface EditGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  setName: (v: string) => void
  advanceCount: number
  setAdvanceCount: (v: number) => void
  saving: boolean
  onSave: () => void
}

export function EditGroupDialog({
  open, onOpenChange, name, setName, advanceCount, setAdvanceCount, saving, onSave,
}: EditGroupDialogProps) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave()
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Grup"
      onSubmit={handleSubmit}
      submitting={saving}
      submitDisabled={!name.trim()}
      maxWidth="sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama Grup</label>
        <Input placeholder="Contoh: Grup A" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Jumlah Lolos</label>
        <Input type="number" min={0} value={advanceCount} onChange={(e) => setAdvanceCount(e.target.value === '' ? 0 : parseInt(e.target.value))} />
        <p className="text-[10px] text-stone-400 dark:text-zinc-500 mt-1">Set 0 untuk format grup saja (tanpa playoff)</p>
      </div>
    </FormDialog>
  )
}
