'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TINGKAT_OPTIONS } from './TournamentWizardDialog'
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
  const [editFormat, setEditFormat] = useState('single_elimination')
  const [editBestOf, setEditBestOf] = useState('3')
  const [editMaxTeams, setEditMaxTeams] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editSchoolLevel, setEditSchoolLevel] = useState('')
  const [editDailyStartTime, setEditDailyStartTime] = useState('')
  const [editDefaultNumMaps, setEditDefaultNumMaps] = useState(1)
  const [editDefaultMapNames, setEditDefaultMapNames] = useState<string[]>([])
  const [editTiebreakerOrder, setEditTiebreakerOrder] = useState<string[]>(['wwcd', 'placement_points', 'kills'])
  const [editPrizePool, setEditPrizePool] = useState('')
  const [editPrizeDescription, setEditPrizeDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && tournament) {
      setEditName(tournament.name)
      setEditFormat(tournament.format)
      setEditBestOf(String(tournament.best_of))
      setEditMaxTeams(tournament.max_teams ? String(tournament.max_teams) : '')
      setEditStatus(tournament.status)
      setEditSchoolLevel(tournament.school_level ?? '')
      setEditDailyStartTime(tournament.daily_start_time ?? '')
      setEditDefaultNumMaps(tournament.default_num_maps ?? 1)
      setEditDefaultMapNames(tournament.default_map_names ?? [])
      const order = (tournament.tiebreaker_order ?? []).filter(k => k !== 'best_placement')
      setEditTiebreakerOrder(order.length ? order : ['wwcd', 'placement_points', 'kills'])
      setEditPrizePool(tournament.prize_pool ?? '')
      setEditPrizeDescription(tournament.prize_description ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tournament])

  function handleOpenChange(val: boolean) {
    onOpenChange(val)
  }

  async function handleEdit() {
    if (!tournament) return

    // Client-side validation
    if (editName.trim().length < 2) {
      toast.error('Nama turnamen minimal 2 karakter')
      return
    }
    const bestOf = parseInt(editBestOf)
    if (bestOf && (bestOf < 1 || bestOf % 2 === 0)) {
      toast.error('Best Of harus minimal 1 dan bilangan ganjil')
      return
    }
    const maxTeams = editMaxTeams ? parseInt(editMaxTeams) : 0
    if (maxTeams > 0 && maxTeams < 2) {
      toast.error('Maksimum tim harus minimal 2')
      return
    }

    setSaving(true)
    try {
      await api.put(`/admin/tournaments/${tournament.id}`, {
        name: editName.trim(),
        format: editFormat,
        best_of: parseInt(editBestOf),
        max_teams: editMaxTeams ? parseInt(editMaxTeams) : null,
        school_level: editSchoolLevel || null,
        status: editStatus,
        daily_start_time: editDailyStartTime || null,
        default_num_maps: editDefaultNumMaps,
        default_map_names: editDefaultMapNames.filter(Boolean),
        tiebreaker_order: [...editTiebreakerOrder, 'best_placement'],
        prize_pool: editPrizePool.trim() || null,
        prize_description: editPrizeDescription.trim() || null,
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
      <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-zinc-100">Edit Turnamen</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Nama Turnamen</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Format</label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { value: 'single_elimination', label: 'Single Elim' },
                  { value: 'double_elimination', label: 'Double Elim' },
                  { value: 'group_stage_playoff', label: 'Grup + Playoff' },
                  { value: 'battle_royale_points', label: 'Battle Royale' },
                ] as { value: string; label: string }[]).map(f => (
                  <button
                    key={f.value}
                    onClick={() => setEditFormat(f.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      editFormat === f.value
                        ? 'border-esi-red bg-esi-red text-white'
                        : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Status</label>
              {(() => {
                const allStatuses = [
                  { value: 'upcoming', label: 'Akan Datang' },
                  { value: 'registration', label: 'Registrasi Dibuka' },
                  { value: 'ongoing', label: 'Berlangsung' },
                  { value: 'completed', label: 'Selesai' },
                  { value: 'cancelled', label: 'Dibatalkan' },
                ] as { value: string; label: string }[]

                // Valid transitions from the original (saved) tournament status
                const allowedTransitions: Record<string, string[]> = {
                  upcoming: ['upcoming', 'registration', 'cancelled'],
                  registration: ['registration', 'ongoing', 'cancelled'],
                  ongoing: ['ongoing', 'completed', 'cancelled'],
                  active: ['active', 'completed', 'cancelled'],
                  completed: ['completed'],
                  cancelled: ['cancelled'],
                }
                const currentStatus = tournament?.status ?? 'upcoming'
                const allowed = allowedTransitions[currentStatus] ?? allStatuses.map(s => s.value)
                const isTerminal = currentStatus === 'completed' || currentStatus === 'cancelled'

                return (
                  <div className="flex flex-wrap gap-1.5">
                    {allStatuses.map(s => {
                      const isAllowed = allowed.includes(s.value)
                      const isActive = editStatus === s.value
                      return (
                        <button
                          key={s.value}
                          onClick={() => isAllowed && setEditStatus(s.value)}
                          disabled={!isAllowed || isTerminal}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? 'border-esi-red bg-esi-red text-white'
                              : !isAllowed || isTerminal
                                ? 'border-stone-100 dark:border-zinc-800 text-stone-300 dark:text-zinc-600 cursor-not-allowed opacity-50'
                                : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                          }`}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
              {(tournament?.status === 'completed' || tournament?.status === 'cancelled') && (
                <p className="mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
                  Status &quot;{tournament.status === 'completed' ? 'Selesai' : 'Dibatalkan'}&quot; tidak bisa diubah lagi.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Tingkat</label>
              <div className="flex flex-wrap gap-1.5">
                {TINGKAT_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setEditSchoolLevel(t.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      editSchoolLevel === t.value
                        ? 'border-esi-red bg-esi-red text-white'
                        : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">
                Jam Mulai Harian
              </label>
              <Input
                type="time"
                value={editDailyStartTime}
                onChange={(e) => setEditDailyStartTime(e.target.value)}
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
                Setelah jam ini, player bisa submit hasil tanpa admin set live manual. Kosongkan untuk nonaktifkan.
              </p>
            </div>
            {/* BR default map config */}
            {editFormat === 'battle_royale_points' && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Konfigurasi Map Default (Battle Royale)</p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-zinc-400">Jumlah Map per Lobby</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editDefaultNumMaps}
                    onChange={(e) => {
                      const n = Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                      setEditDefaultNumMaps(n)
                      setEditDefaultMapNames((prev) => {
                        const next = [...prev]
                        while (next.length < n) next.push('')
                        return next.slice(0, n)
                      })
                    }}
                    className="w-24 rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400">Nama Map (urutan main)</label>
                  {Array.from({ length: editDefaultNumMaps }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-xs text-stone-400 dark:text-zinc-500">Map {i + 1}</span>
                      <input
                        type="text"
                        placeholder="mis. Erangel"
                        value={editDefaultMapNames[i] ?? ''}
                        onChange={(e) => {
                          const next = [...editDefaultMapNames]
                          next[i] = e.target.value
                          setEditDefaultMapNames(next)
                        }}
                        className="flex-1 rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20"
                      />
                    </div>
                  ))}
                </div>
                {/* Tiebreaker order */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-zinc-400">
                    Urutan Tiebreaker (setelah Total Poin)
                  </label>
                  <p className="mb-2 text-[10px] text-stone-400 dark:text-zinc-500">
                    Best Placement selalu jadi tiebreaker terakhir otomatis.
                  </p>
                  <div className="space-y-1">
                    {editTiebreakerOrder.map((key, i) => {
                      const labels: Record<string, string> = {
                        wwcd: 'WWCD / Booyah',
                        placement_points: 'Placement Points',
                        kills: 'Total Kills',
                      }
                      return (
                        <div key={key} className="flex items-center gap-2 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5">
                          <span className="w-5 shrink-0 text-center text-xs font-bold text-esi-red">{i + 1}</span>
                          <span className="flex-1 text-xs font-medium text-stone-700 dark:text-zinc-300">{labels[key] ?? key}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (i === 0) return
                                const next = [...editTiebreakerOrder]
                                ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                                setEditTiebreakerOrder(next)
                              }}
                              disabled={i === 0}
                              className="rounded px-1.5 py-0.5 text-xs text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 disabled:opacity-30"
                            >↑</button>
                            <button
                              onClick={() => {
                                if (i === editTiebreakerOrder.length - 1) return
                                const next = [...editTiebreakerOrder]
                                ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                                setEditTiebreakerOrder(next)
                              }}
                              disabled={i === editTiebreakerOrder.length - 1}
                              className="rounded px-1.5 py-0.5 text-xs text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700 disabled:opacity-30"
                            >↓</button>
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex items-center gap-2 rounded-md border border-dashed border-stone-200 dark:border-zinc-700 px-3 py-1.5 opacity-50">
                      <span className="w-5 shrink-0 text-center text-xs font-bold text-stone-400">{editTiebreakerOrder.length + 1}</span>
                      <span className="text-xs text-stone-400 dark:text-zinc-500">Best Placement (otomatis)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {editFormat !== 'battle_royale_points' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Best Of</label>
                <div className="flex gap-1">
                  {['1', '3', '5'].map(v => (
                    <button
                      key={v}
                      onClick={() => setEditBestOf(v)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                        editBestOf === v
                          ? 'border-esi-red bg-esi-red text-white'
                          : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50'
                      }`}
                    >
                      BO{v}
                    </button>
                  ))}
                </div>
              </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Maks Tim</label>
                <Input
                  value={editMaxTeams}
                  onChange={(e) => setEditMaxTeams(e.target.value)}
                  placeholder="Opsional"
                  type="number"
                  className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Hadiah (Prize Pool)</label>
              <Input
                value={editPrizePool}
                onChange={(e) => setEditPrizePool(e.target.value)}
                placeholder='mis. "Rp 5.000.000" atau "Trofi + Sertifikat"'
                className="bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 focus:border-esi-red"
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">Ditampilkan di halaman detail turnamen. Kosongkan jika tidak ada.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-zinc-300">Rincian Hadiah</label>
              <textarea
                value={editPrizeDescription}
                onChange={(e) => setEditPrizeDescription(e.target.value)}
                placeholder={'Contoh:\nJuara 1: Rp 3.000.000 + Trofi\nJuara 2: Rp 1.500.000\nJuara 3: Rp 500.000'}
                rows={4}
                className="w-full rounded-md border border-stone-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-stone-300 dark:border-zinc-600">
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-esi-red hover:bg-esi-red-dark text-white">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
