'use client'

import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { GameSlug } from '@/types'
import type { School } from '../hooks/usePaginatedTeams'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: { name: string; game_id: string; school_id: string }
  setForm: React.Dispatch<React.SetStateAction<{ name: string; game_id: string; school_id: string }>>
  loading: boolean
  onSubmit: () => void
  games: { id: string; slug: GameSlug; name: string }[]
  schools: School[]
}

export function CreateTeamDialog({ open, onOpenChange, form, setForm, loading, onSubmit, games, schools }: Props) {
  function handleOpenChange(o: boolean) {
    onOpenChange(o)
    if (!o) setForm({ name: '', game_id: '', school_id: '' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Tambah Tim Baru"
      description="Buat tim baru. Admin akan menjadi kapten sementara."
      onSubmit={handleSubmit}
      submitting={loading}
      submitLabel="Buat Tim"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-700 dark:text-zinc-300">Nama Tim</label>
        <Input
          placeholder="Nama tim (3-50 karakter)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="border-stone-300 dark:border-zinc-600"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-700 dark:text-zinc-300">Game</label>
        <select
          value={form.game_id}
          onChange={(e) => setForm((f) => ({ ...f, game_id: e.target.value }))}
          className="w-full rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-esi-red"
        >
          <option value="">Pilih game...</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-700 dark:text-zinc-300">Sekolah</label>
        <select
          value={form.school_id}
          onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
          className="w-full rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-esi-red"
        >
          <option value="">Pilih sekolah...</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </FormDialog>
  )
}
