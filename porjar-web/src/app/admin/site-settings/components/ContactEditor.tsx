'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { FormDialog } from '@/components/shared/FormDialog'
import type { ContactItem } from '@/types/site-settings'

interface Props {
  items: ContactItem[]
  onChange: (items: ContactItem[]) => void
}

const EMPTY: ContactItem = { name: '', phone: '', role: '' }

export function ContactEditor({ items, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<ContactItem>(EMPTY)

  function openCreate() {
    setEditIndex(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(i: number) {
    setEditIndex(i)
    setForm({ role: '', ...items[i] })
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    const next = [...items]
    const payload: ContactItem = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role?.trim() || undefined,
    }
    if (editIndex === null) {
      next.push(payload)
    } else {
      next[editIndex] = payload
    }
    onChange(next)
    setOpen(false)
  }

  function handleDelete(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">{items.length} kontak</p>
        <Button size="sm" onClick={openCreate} className="bg-esi-red hover:bg-esi-red-dark text-white">
          <Plus size={16} weight="bold" className="mr-1" />
          Tambah Kontak
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-stone-500 italic">Belum ada kontak.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Card key={i} className="p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{it.name}{it.role ? <span className="text-stone-500 font-normal"> · {it.role}</span> : null}</p>
                <p className="text-sm text-stone-600">{it.phone}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openEdit(i)}>
                  <PencilSimple size={14} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(i)}>
                  <Trash size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editIndex === null ? 'Tambah Kontak' : 'Edit Kontak'}
        onSubmit={handleSubmit}
        submitDisabled={!form.name.trim() || !form.phone.trim()}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Panitia 1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nomor Telepon</label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+62..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Peran (opsional)</label>
          <Input
            value={form.role ?? ''}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Koordinator"
          />
        </div>
      </FormDialog>
    </div>
  )
}
