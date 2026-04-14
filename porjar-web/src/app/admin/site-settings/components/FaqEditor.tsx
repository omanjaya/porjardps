'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { FormDialog } from '@/components/shared/FormDialog'
import type { FaqItem } from '@/types/site-settings'

interface Props {
  items: FaqItem[]
  onChange: (items: FaqItem[]) => void
}

const EMPTY: FaqItem = { question: '', answer: '' }

export function FaqEditor({ items, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<FaqItem>(EMPTY)

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
    if (!form.question.trim() || !form.answer.trim()) return
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
    const next = items.filter((_, idx) => idx !== i)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">{items.length} FAQ</p>
        <Button size="sm" onClick={openCreate} className="bg-esi-red hover:bg-esi-red-dark text-white">
          <Plus size={16} weight="bold" className="mr-1" />
          Tambah FAQ
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-stone-500 italic">Belum ada FAQ.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <Card key={i} className="p-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{it.question}</p>
                <p className="text-sm text-stone-600 whitespace-pre-wrap mt-1">{it.answer}</p>
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
        title={editIndex === null ? 'Tambah FAQ' : 'Edit FAQ'}
        onSubmit={handleSubmit}
        submitDisabled={!form.question.trim() || !form.answer.trim()}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Pertanyaan</label>
          <Input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="Bagaimana cara daftar?"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-zinc-300">Jawaban</label>
          <Textarea
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            rows={5}
            placeholder="Silakan kunjungi halaman pendaftaran..."
          />
        </div>
      </FormDialog>
    </div>
  )
}
