'use client'

import { useState, useEffect } from 'react'
import { X, FloppyDisk } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ScreenshotUploader } from '@/components/modules/submission/ScreenshotUploader'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'
import { useEditScreenshots } from '../hooks/useScreenshots'

interface Props {
  submission: SubmissionData
  onClose: () => void
  onSaved: () => void
}

export function EditSubmissionDialog({ submission, onClose, onSaved }: Props) {
  const [editScoreA, setEditScoreA] = useState('')
  const [editScoreB, setEditScoreB] = useState('')
  const [editPlacement, setEditPlacement] = useState('')
  const [editKillsP1, setEditKillsP1] = useState('')
  const [editKillsP2, setEditKillsP2] = useState('')
  const [editKillsP3, setEditKillsP3] = useState('')
  const [editKillsP4, setEditKillsP4] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const {
    editNewScreenshots,
    setEditNewScreenshots,
    editExistingScreenshots,
    deletingScreenshot,
    initFrom,
    handleDeleteExistingScreenshot,
  } = useEditScreenshots()

  useEffect(() => {
    if (submission.match_type === 'bracket' || submission.match_type === 'group') {
      setEditScoreA(submission.claimed_score_a != null ? String(submission.claimed_score_a) : '')
      setEditScoreB(submission.claimed_score_b != null ? String(submission.claimed_score_b) : '')
    } else {
      setEditPlacement(submission.claimed_placement != null ? String(submission.claimed_placement) : '')
      setEditKillsP1(String(submission.kills_p1 ?? 0))
      setEditKillsP2(String(submission.kills_p2 ?? 0))
      setEditKillsP3(String(submission.kills_p3 ?? 0))
      setEditKillsP4(String(submission.kills_p4 ?? 0))
    }
    initFrom(submission)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission])

  async function handleSaveEditSubmission() {
    if (submission.match_type === 'bracket' || submission.match_type === 'group') {
      const a = parseInt(editScoreA)
      const b = parseInt(editScoreB)
      if (isNaN(a) || isNaN(b)) { toast.error('Masukkan skor pertandingan'); return }
      // P4: eFootball-specific check must come before generic draw check
      if (submission.game_slug === 'efootball' && a === b) {
        toast.error('eFootball tidak boleh seri, harus ada pemenang')
        return
      }
      if (a === b) { toast.error('Skor tidak boleh seri, harus ada pemenang'); return }
    } else {
      if (!editPlacement) { toast.error('Pilih placement'); return }
    }

    setSavingEdit(true)
    try {
      const body: Record<string, unknown> = {}
      if (submission.match_type === 'bracket' || submission.match_type === 'group') {
        body.claimed_score_a = parseInt(editScoreA)
        body.claimed_score_b = parseInt(editScoreB)
      } else {
        body.claimed_placement = parseInt(editPlacement)
        body.kills_p1 = parseInt(editKillsP1) || 0
        body.kills_p2 = parseInt(editKillsP2) || 0
        body.kills_p3 = parseInt(editKillsP3) || 0
        body.kills_p4 = parseInt(editKillsP4) || 0
      }
      // P3: Merge existing and new screenshots so old ones are not lost
      const allScreenshots = [...editExistingScreenshots, ...editNewScreenshots]
      if (allScreenshots.length > 0) body.screenshots = allScreenshots
      await api.put(`/submissions/${submission.id}`, body)
      toast.success('Submission berhasil diperbarui!')
      onClose()
      onSaved()
    } catch {
      toast.error('Gagal memperbarui submission')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-xl sm:rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 dark:border-zinc-700 px-5 py-3 bg-white dark:bg-zinc-900">
          <h3 className="text-sm font-bold text-esi-text">Edit Submission</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {submission.match_type === 'bracket' || submission.match_type === 'group' ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-esi-text">
                  {submission.game_slug === 'efootball' ? 'Skor Gol' : 'Skor Pertandingan'} <span className="text-esi-red">*</span>
                </label>
                {(() => {
                  const a = parseInt(editScoreA)
                  const b = parseInt(editScoreB)
                  const winnerSide = !isNaN(a) && !isNaN(b) && a !== b ? (a > b ? 'team_a' : 'team_b') : null
                  return (
                    <>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <label className={cn('mb-1 block text-xs truncate font-semibold', winnerSide === 'team_a' ? 'text-esi-red' : 'text-esi-muted')} title={submission.team_a_name}>
                            {submission.team_a_name} {winnerSide === 'team_a' && '🏆'}
                          </label>
                          <input type="number" min="0" max="99" inputMode="numeric" placeholder="0" value={editScoreA} onChange={e => setEditScoreA(e.target.value)}
                            onFocus={e => e.target.select()}
                            className={cn('w-full rounded-lg border px-3 py-2.5 text-center text-lg font-bold focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                              winnerSide === 'team_a' ? 'border-esi-red ring-1 ring-esi-red/30 focus:ring-esi-red/40' : 'border-stone-200 dark:border-zinc-700 focus:border-esi-red focus:ring-esi-red/20'
                            )} />
                        </div>
                        <span className="shrink-0 pb-2.5 text-lg font-bold text-stone-400 dark:text-zinc-400">-</span>
                        <div className="flex-1 min-w-0">
                          <label className={cn('mb-1 block text-xs truncate font-semibold', winnerSide === 'team_b' ? 'text-esi-red' : 'text-esi-muted')} title={submission.team_b_name}>
                            {submission.team_b_name} {winnerSide === 'team_b' && '🏆'}
                          </label>
                          <input type="number" min="0" max="99" inputMode="numeric" placeholder="0" value={editScoreB} onChange={e => setEditScoreB(e.target.value)}
                            onFocus={e => e.target.select()}
                            className={cn('w-full rounded-lg border px-3 py-2.5 text-center text-lg font-bold focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                              winnerSide === 'team_b' ? 'border-esi-red ring-1 ring-esi-red/30 focus:ring-esi-red/40' : 'border-stone-200 dark:border-zinc-700 focus:border-esi-red focus:ring-esi-red/20'
                            )} />
                        </div>
                      </div>
                      {winnerSide && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          Pemenang otomatis: {winnerSide === 'team_a' ? submission.team_a_name : submission.team_b_name}
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-esi-text">
                  Placement <span className="text-esi-red">*</span>
                </label>
                <select value={editPlacement} onChange={e => setEditPlacement(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 px-4 py-2.5 text-sm font-medium focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20">
                  <option value="">Pilih placement...</option>
                  {Array.from({ length: submission.game_slug === 'pubgm' ? 25 : submission.game_slug === 'ff' ? 18 : 100 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>#{i + 1}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-esi-text">
                    Kills per Pemain <span className="text-esi-red">*</span>
                  </label>
                  <span className="text-xs font-semibold text-esi-muted">
                    Total: <span className="text-esi-red">
                      {[editKillsP1, editKillsP2, editKillsP3, editKillsP4].map(v => parseInt(v) || 0).reduce((a, b) => a + b, 0)}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Pemain 1', value: editKillsP1, set: setEditKillsP1 },
                    { label: 'Pemain 2', value: editKillsP2, set: setEditKillsP2 },
                    { label: 'Pemain 3', value: editKillsP3, set: setEditKillsP3 },
                    { label: 'Pemain 4', value: editKillsP4, set: setEditKillsP4 },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="mb-1 block text-xs text-esi-muted">{label}</label>
                      <input type="number" min="0" max="99" inputMode="numeric" placeholder="0"
                        value={value} onChange={e => set(e.target.value)}
                        className="w-full rounded-lg border border-stone-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 text-sm focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {editExistingScreenshots.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-esi-muted">Screenshot Tersimpan</label>
              <div className="flex flex-wrap gap-2">
                {editExistingScreenshots.map((url, i) => (
                  <div key={url} className="relative group rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 w-20 h-20 shrink-0">
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeleteExistingScreenshot(submission.id, url)}
                      disabled={deletingScreenshot === url || editExistingScreenshots.length === 1}
                      title={editExistingScreenshots.length === 1 ? 'Minimal 1 screenshot harus ada' : 'Hapus screenshot ini'}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {deletingScreenshot === url
                        ? <div className="h-3 w-3 animate-spin rounded-full border border-white/50 border-t-white" />
                        : <X size={10} weight="bold" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium text-esi-muted">Tambah Screenshot Baru (opsional)</label>
            <ScreenshotUploader onUpload={setEditNewScreenshots} maxFiles={
              submission.match_type === 'battle_royale'
                ? Math.max(1, 2 - editExistingScreenshots.length)
                : submission.game_slug === 'ml' || submission.game_slug === 'efootball'
                  ? Math.max(1, 1 - editExistingScreenshots.length)
                  : submission.game_slug === 'hok'
                    ? Math.max(1, 3 - editExistingScreenshots.length)
                    : Math.max(1, 5 - editExistingScreenshots.length)
            } />
          </div>

          <Button
            onClick={handleSaveEditSubmission}
            disabled={savingEdit}
            className="w-full bg-esi-red text-white hover:brightness-110"
          >
            {savingEdit ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FloppyDisk size={16} weight="fill" />
                Simpan Perubahan
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
