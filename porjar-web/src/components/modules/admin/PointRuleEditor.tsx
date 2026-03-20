'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FloppyDisk, Lightning, Eye } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { BR_POINT_PRESETS, calculatePoints, type BRPointPreset } from '@/constants/br-presets'

interface PointRuleEditorProps {
  tournamentId: string
  currentRules?: { placement: number; points: number }[]
  killPointValue?: number
  wwcdBonus?: number
  qualificationThreshold?: number
  onSave: () => void
}

type PresetKey = 'pmpl' | 'ffws' | 'porjar_default' | 'custom'

export function PointRuleEditor({
  tournamentId,
  currentRules,
  killPointValue: initialKillPt = 1,
  wwcdBonus: initialWwcd = 0,
  qualificationThreshold: initialThreshold = 0,
  onSave,
}: PointRuleEditorProps) {
  // Determine initial preset
  const [activePreset, setActivePreset] = useState<PresetKey>('custom')

  // Build initial placements from currentRules or default
  const initialPlacements = useMemo(() => {
    const map: Record<number, number> = {}
    if (currentRules && currentRules.length > 0) {
      for (const rule of currentRules) {
        map[rule.placement] = rule.points
      }
    } else {
      // Default: porjar_default
      Object.assign(map, BR_POINT_PRESETS.porjar_default.placements)
    }
    return map
  }, [currentRules])

  const [placements, setPlacements] = useState<Record<number, number>>(initialPlacements)
  const [killPointValue, setKillPointValue] = useState(initialKillPt)
  const [wwcdBonus, setWwcdBonus] = useState(initialWwcd)
  const [qualificationThreshold, setQualificationThreshold] = useState(initialThreshold)
  const [maxLobbyTeams, setMaxLobbyTeams] = useState(16)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Example calculation for preview
  const exampleCalc = useMemo(() => {
    return calculatePoints(1, 8, placements, killPointValue, wwcdBonus)
  }, [placements, killPointValue, wwcdBonus])

  function applyPreset(key: PresetKey) {
    if (key === 'custom') {
      setActivePreset('custom')
      return
    }
    const preset: BRPointPreset = BR_POINT_PRESETS[key]
    setPlacements({ ...preset.placements })
    setKillPointValue(preset.killPointValue)
    setWwcdBonus(preset.wwcdBonus)
    setMaxLobbyTeams(preset.maxTeams)
    setActivePreset(key)
  }

  function updatePlacement(pos: number, pts: number) {
    setPlacements((prev) => ({ ...prev, [pos]: Math.max(0, pts) }))
    setActivePreset('custom')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const rules = Object.entries(placements).map(([placement, points]) => ({
        placement: Number(placement),
        points,
      }))

      await api.put(`/admin/tournaments/${tournamentId}/point-rules`, {
        rules,
        kill_point_value: killPointValue,
        wwcd_bonus: wwcdBonus,
        qualification_threshold: qualificationThreshold,
        max_lobby_teams: maxLobbyTeams,
      })

      toast.success('Point rules berhasil disimpan')
      onSave()
    } catch {
      toast.error('Gagal menyimpan point rules')
    } finally {
      setSaving(false)
    }
  }

  const maxPos = maxLobbyTeams

  return (
    <div className="space-y-6">
      {/* Glassmorphism card */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
          <Lightning size={20} weight="fill" className="text-amber-400" />
          Konfigurasi Point Rules
        </h3>

        {/* Preset buttons */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Preset Format
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BR_POINT_PRESETS) as string[]).map((key) => {
              const preset = BR_POINT_PRESETS[key]
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key as PresetKey)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                    activePreset === key
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                      : 'border-slate-700/50 bg-slate-900/40 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
                  )}
                >
                  <span className="block">{preset.name}</span>
                  <span className="block text-[10px] opacity-70">{preset.description}</span>
                </button>
              )
            })}
            <button
              onClick={() => applyPreset('custom')}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                activePreset === 'custom'
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                  : 'border-slate-700/50 bg-slate-900/40 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
              )}
            >
              <span className="block">Custom</span>
              <span className="block text-[10px] opacity-70">Atur sendiri</span>
            </button>
          </div>
        </div>

        {/* Placement points grid */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Poin per Placement
          </label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: maxPos }, (_, i) => i + 1).map((pos) => (
              <div
                key={pos}
                className="rounded-lg border border-slate-700/30 bg-slate-900/50 p-2 text-center"
              >
                <div className="text-[10px] font-medium text-slate-500 mb-1">
                  #{pos}
                </div>
                <Input
                  type="number"
                  min={0}
                  value={placements[pos] ?? 0}
                  onChange={(e) => updatePlacement(pos, parseInt(e.target.value) || 0)}
                  className="h-9 w-full text-center bg-transparent border-slate-700/50 text-slate-200 text-sm px-1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Kill points, WWCD, Qualification, Max teams */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Kill Point Value
            </label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={killPointValue}
              onChange={(e) => {
                setKillPointValue(parseFloat(e.target.value) || 0)
                setActivePreset('custom')
              }}
              className="bg-slate-900/60 border-slate-700 text-slate-200"
            />
            <p className="mt-1 text-[10px] text-slate-500">Mendukung desimal: 0.5, 1.0, 1.5, 2.0</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              WWCD Bonus
            </label>
            <Input
              type="number"
              min={0}
              max={10}
              value={wwcdBonus}
              onChange={(e) => {
                setWwcdBonus(parseInt(e.target.value) || 0)
                setActivePreset('custom')
              }}
              className="bg-slate-900/60 border-slate-700 text-slate-200"
            />
            <p className="mt-1 text-[10px] text-slate-500">Bonus poin untuk posisi 1</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Qualification Threshold
            </label>
            <Input
              type="number"
              min={0}
              value={qualificationThreshold}
              onChange={(e) => setQualificationThreshold(parseInt(e.target.value) || 0)}
              className="bg-slate-900/60 border-slate-700 text-slate-200"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Tim dengan poin {'>'}= {qualificationThreshold || 'X'} lolos ke Final
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Max Lobby Teams
            </label>
            <select
              value={maxLobbyTeams}
              onChange={(e) => {
                setMaxLobbyTeams(parseInt(e.target.value))
                setActivePreset('custom')
              }}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-200"
            >
              <option value={12}>12 (Free Fire)</option>
              <option value={16}>16 (PUBG Mobile)</option>
              <option value={20}>20 (Custom)</option>
            </select>
          </div>
        </div>

        {/* Preview section */}
        <div className="rounded-lg border border-slate-700/30 bg-slate-900/40 p-4 mb-6">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Eye size={16} />
              Preview Kalkulasi
            </span>
            <span className="text-xs text-slate-500">{showPreview ? 'Sembunyikan' : 'Tampilkan'}</span>
          </button>
          {showPreview && (
            <div className="mt-3 space-y-2">
              <div className="rounded-md bg-slate-800/60 p-3">
                <p className="text-xs text-slate-500 mb-2">Contoh: Posisi 1 + 8 kills + WWCD</p>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="rounded bg-blue-500/15 px-2 py-0.5 text-blue-400">
                    Placement: {exampleCalc.placementPts}
                  </span>
                  <span className="text-slate-600">+</span>
                  <span className="rounded bg-green-500/15 px-2 py-0.5 text-green-400">
                    Kills: {exampleCalc.killPts}
                  </span>
                  {exampleCalc.wwcd > 0 && (
                    <>
                      <span className="text-slate-600">+</span>
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-400">
                        WWCD: {exampleCalc.wwcd}
                      </span>
                    </>
                  )}
                  <span className="text-slate-600">=</span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-400">
                    {exampleCalc.total} poin
                  </span>
                </div>
              </div>

              {/* Full table preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/30">
                      <th className="px-2 py-1 text-left text-slate-500">Posisi</th>
                      <th className="px-2 py-1 text-right text-slate-500">Placement Pts</th>
                      <th className="px-2 py-1 text-right text-slate-500">+ 5 Kills</th>
                      {wwcdBonus > 0 && (
                        <th className="px-2 py-1 text-right text-slate-500">+ WWCD</th>
                      )}
                      <th className="px-2 py-1 text-right text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.min(maxPos, 8) }, (_, i) => i + 1).map((pos) => {
                      const calc = calculatePoints(pos, 5, placements, killPointValue, wwcdBonus)
                      return (
                        <tr key={pos} className="border-b border-slate-700/20">
                          <td className="px-2 py-1 text-slate-300">#{pos}</td>
                          <td className="px-2 py-1 text-right text-slate-400">{calc.placementPts}</td>
                          <td className="px-2 py-1 text-right text-slate-400">{calc.killPts}</td>
                          {wwcdBonus > 0 && (
                            <td className="px-2 py-1 text-right text-amber-400">{calc.wwcd}</td>
                          )}
                          <td className="px-2 py-1 text-right font-bold text-amber-400">{calc.total}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <FloppyDisk size={16} className="mr-1.5" />
          {saving ? 'Menyimpan...' : 'Simpan Point Rules'}
        </Button>
      </div>
    </div>
  )
}
