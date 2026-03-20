'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Tournament } from '@/types'

interface TournamentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournament: Tournament | null
  onSaved: () => void
}

export function TournamentEditDialog({
  open,
  onOpenChange,
  tournament,
  onSaved,
}: TournamentEditDialogProps) {
  const [editName, setEditName] = useState('')
  const [editBestOf, setEditBestOf] = useState('3')
  const [editMaxTeams, setEditMaxTeams] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync form when tournament changes
  function handleOpenChange(val: boolean) {
    if (val && tournament) {
      setEditName(tournament.name)
      setEditBestOf(String(tournament.best_of))
      setEditMaxTeams(tournament.max_teams ? String(tournament.max_teams) : '')
      setEditStatus(tournament.status)
    }
    onOpenChange(val)
  }

  async function handleEdit() {
    if (!tournament) return
    setSaving(true)
    try {
      await api.put(`/admin/tournaments/${tournament.id}`, {
        name: editName.trim(),
        best_of: parseInt(editBestOf),
        max_teams: editMaxTeams ? parseInt(editMaxTeams) : null,
        status: editStatus,
      })
      toast.success('Turnamen berhasil diperbarui')
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui turnamen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-stone-200 sm:max-w-md">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">Edit Turnamen</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Nama Turnamen</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white border-stone-300 focus:border-porjar-red"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { value: 'upcoming', label: 'Akan Datang' },
                  { value: 'registration', label: 'Registrasi Dibuka' },
                  { value: 'ongoing', label: 'Berlangsung' },
                  { value: 'completed', label: 'Selesai' },
                  { value: 'cancelled', label: 'Dibatalkan' },
                ] as { value: string; label: string }[]).map(s => (
                  <button
                    key={s.value}
                    onClick={() => setEditStatus(s.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      editStatus === s.value
                        ? 'border-porjar-red bg-porjar-red text-white'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Best Of</label>
                <div className="flex gap-1">
                  {['1', '3', '5'].map(v => (
                    <button
                      key={v}
                      onClick={() => setEditBestOf(v)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                        editBestOf === v
                          ? 'border-porjar-red bg-porjar-red text-white'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      BO{v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Maks Tim</label>
                <Input
                  value={editMaxTeams}
                  onChange={(e) => setEditMaxTeams(e.target.value)}
                  placeholder="Opsional"
                  type="number"
                  className="bg-white border-stone-300 focus:border-porjar-red"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300">
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
