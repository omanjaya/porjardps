'use client'

import { FormDialog } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  setName: (v: string) => void
  order: number
  setOrder: (v: number) => void
  advanceCount: number
  setAdvanceCount: (v: number) => void
  legs: number
  setLegs: (v: number) => void
  creating: boolean
  onCreate: () => void
}

export function CreateGroupDialog({
  open, onOpenChange, name, setName, order, setOrder,
  advanceCount, setAdvanceCount, legs, setLegs, creating, onCreate,
}: CreateGroupDialogProps) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onCreate()
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buat Grup Baru"
      onSubmit={handleSubmit}
      submitting={creating}
      submitDisabled={!name.trim()}
      submitLabel="Buat Grup"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama Grup</label>
        <Input placeholder="Contoh: Grup A" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Urutan</label>
          <Input type="number" min={1} value={order} onChange={(e) => setOrder(e.target.value === '' ? 1 : parseInt(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Jumlah Lolos</label>
          <Input type="number" min={1} value={advanceCount} onChange={(e) => setAdvanceCount(e.target.value === '' ? 2 : parseInt(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Jumlah Leg</label>
          <select
            value={legs}
            onChange={(e) => setLegs(parseInt(e.target.value))}
            className="flex h-9 w-full rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-sm text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-esi-red"
          >
            <option value={1}>1 (Single)</option>
            <option value={2}>2 (Home &amp; Away)</option>
          </select>
        </div>
      </div>
    </FormDialog>
  )
}
