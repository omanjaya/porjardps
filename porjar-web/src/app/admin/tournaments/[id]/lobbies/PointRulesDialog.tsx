'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/shared/FormDialog'
import type { Tournament } from '@/types'

interface PointRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pointRules: { placement: number; points: number }[]
  tournament: Tournament | null
  onSave: (data: {
    kill_point_value: number
    wwcd_bonus: number
    rules: { placement: number; points: number }[]
  }) => Promise<void>
}

export function PointRulesDialog({
  open,
  onOpenChange,
  pointRules,
  tournament,
  onSave,
}: PointRulesDialogProps) {
  const [editRules, setEditRules] = useState<{ placement: number; points: number }[]>([])
  const [editKillValue, setEditKillValue] = useState('1')
  const [editWwcdBonus, setEditWwcdBonus] = useState('0')
  const [savingRules, setSavingRules] = useState(false)

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (pointRules.length > 0) {
        setEditRules([...pointRules].sort((a, b) => a.placement - b.placement))
      } else {
        setEditRules(Array.from({ length: 12 }, (_, i) => ({ placement: i + 1, points: 0 })))
      }
      setEditKillValue(String(tournament?.kill_point_value ?? 1))
      setEditWwcdBonus(String(tournament?.wwcd_bonus ?? 0))
    }
  }, [open, pointRules, tournament])

  function addRulePlacement() {
    const next = editRules.length + 1
    setEditRules((prev) => [...prev, { placement: next, points: 0 }])
  }

  function removeLastPlacement() {
    if (editRules.length <= 1) return
    setEditRules((prev) => prev.slice(0, -1))
  }

  function updateRulePoints(placement: number, points: number) {
    setEditRules((prev) =>
      prev.map((r) => (r.placement === placement ? { ...r, points } : r))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingRules(true)
    try {
      await onSave({
        kill_point_value: parseFloat(editKillValue) || 1,
        wwcd_bonus: parseInt(editWwcdBonus) || 0,
        rules: editRules,
      })
    } finally {
      setSavingRules(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Point Rules"
      description="Atur poin placement, kill, dan Booyah/WWCD"
      onSubmit={handleSubmit}
      submitting={savingRules}
      submitLabel="Simpan Rules"
    >
      {/* Kill & WWCD config */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Kill Point Value</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={editKillValue}
            onChange={(e) => setEditKillValue(e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-zinc-400">Booyah/WWCD Bonus</label>
          <Input
            type="number"
            min="0"
            value={editWwcdBonus}
            onChange={(e) => setEditWwcdBonus(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Placement points table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-stone-500 dark:text-zinc-400">Placement Points</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={removeLastPlacement}
              disabled={editRules.length <= 1}
              className="rounded border border-stone-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              - Hapus
            </button>
            <button
              type="button"
              onClick={addRulePlacement}
              className="rounded border border-stone-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800"
            >
              + Tambah
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-stone-200 dark:border-zinc-700 overflow-hidden">
          <div className="grid grid-cols-[60px_1fr] bg-stone-50 dark:bg-zinc-800/50 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 border-b border-stone-200 dark:border-zinc-700">
            <div className="px-3 py-1.5 text-center">Posisi</div>
            <div className="px-3 py-1.5">Poin</div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {editRules.map((rule) => (
              <div key={rule.placement} className="grid grid-cols-[60px_1fr] border-b border-stone-100 dark:border-zinc-700 last:border-0">
                <div className="px-3 py-1.5 text-center text-xs font-bold text-stone-500 dark:text-zinc-400">
                  #{rule.placement}
                </div>
                <div className="px-2 py-1">
                  <input
                    type="number"
                    min="0"
                    value={rule.points}
                    onChange={(e) => updateRulePoints(rule.placement, e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full rounded border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-0.5 text-sm font-medium text-stone-900 dark:text-zinc-100 focus:border-esi-red focus:outline-none focus:ring-1 focus:ring-esi-red/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current rules info */}
      {pointRules.length > 0 && (
        <p className="text-[10px] text-stone-400 dark:text-zinc-500">
          Saat ini: {pointRules.length} placement, kill={tournament?.kill_point_value ?? 1}, booyah={tournament?.wwcd_bonus ?? 0}
        </p>
      )}
    </FormDialog>
  )
}
