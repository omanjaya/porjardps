'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { FormDialog } from '@/components/shared/FormDialog'
import type { AboutItem } from '@/types/site-settings'

interface Props {
  items: AboutItem[]
  onChange: (items: AboutItem[]) => void
}

const EMPTY: AboutItem = { icon: '', title: '', description: '' }

export function AboutEditor({ items, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<AboutItem>(EMPTY)

  function openCreate() {
    setEditIndex(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(i: number) {
    setEditIndex(i)
    setForm(items[i])
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return
    const next = [...items]
    if (editIndex === null) {
      next.push(form)
    } else {
      next[editIndex] = form
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
        <p className="text-sm text-stone-600">{items.length} item</p>
        <Button size="sm" onClick={openCreate} className="bg-esi-red hover:bg-esi-red-dark text-white">
          <Plus size={16} weight="bold" className="mr-1" />
          Tambah Item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-stone-500 italic">Belum ada item Tentang Kami.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Card key={i} className="p-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {it.icon && <span className="text-xs font-mono text-stone-500">[{it.icon}]</span>}
                  <p className="font-semibold text-sm">{it.title}</p>
                </div>
                <p className="text-sm text-stone-600 whitespace-pre-wrap mt-1">{it.description}</p>
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
        title={editIndex === null ? 'Tambah Item Tentang' : 'Edit Item Tentang'}
        onSubmit={handleSubmit}
        submitDisabled={!form.title.trim() || !form.description.trim()}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Ikon (nama)</label>
          <Input
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="Trophy, Users, Lightning..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Judul</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Visi Kami"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Deskripsi</label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Menjadi wadah esport pelajar terbaik..."
          />
        </div>
      </FormDialog>
    </div>
  )
}
