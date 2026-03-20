'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trophy, FloppyDisk, SortAscending, Warning, MagnifyingGlass } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { calculatePoints } from '@/constants/br-presets'
import type { TeamSummary } from '@/types'

export interface BRGridInputProps {
  lobbyId: string
  teams: { id: string; name: string }[]
  pointRules: { placement: number; points: number }[]
  killPointValue: number
  wwcdBonus: number
  existingResults?: {
    team_id: string
    placement: number
    kills: number
    is_wwcd: boolean
  }[]
  onSave: (
    results: {
      team_id: string
      placement: number
      kills: number
      is_wwcd: boolean
    }[]
  ) => Promise<void>
}

interface RowData {
  teamId: string
  teamName: string
  placement: number
  kills: number
  booyah: boolean
}

type CellId = `${number}-${'placement' | 'kills' | 'booyah'}`

export function BRGridInput({
  lobbyId,
  teams,
  pointRules,
  killPointValue,
  wwcdBonus,
  existingResults,
  onSave,
}: BRGridInputProps) {
  // Build placement lookup from rules
  const placementMap = useMemo(() => {
    const m: Record<number, number> = {}
    for (const r of pointRules) {
      m[r.placement] = r.points
    }
    return m
  }, [pointRules])

  const DRAFT_KEY = `br-draft-${lobbyId}`

  // Initialize rows: draft → existing results → blank
  const [rows, setRows] = useState<RowData[]>(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        const saved: Record<string, { placement: number; kills: number; booyah: boolean }> = JSON.parse(draft)
        return teams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          placement: saved[t.id]?.placement ?? existingResults?.find((r) => r.team_id === t.id)?.placement ?? 0,
          kills: saved[t.id]?.kills ?? existingResults?.find((r) => r.team_id === t.id)?.kills ?? 0,
          booyah: saved[t.id]?.booyah ?? existingResults?.find((r) => r.team_id === t.id)?.is_wwcd ?? false,
        }))
      }
    } catch {}
    return teams.map((t) => {
      const existing = existingResults?.find((r) => r.team_id === t.id)
      return {
        teamId: t.id,
        teamName: t.name,
        placement: existing?.placement ?? 0,
        kills: existing?.kills ?? 0,
        booyah: existing?.is_wwcd ?? false,
      }
    })
  })

  const [activeCell, setActiveCell] = useState<CellId | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save draft to localStorage (debounced 800ms)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        const draft: Record<string, { placement: number; kills: number; booyah: boolean }> = {}
        rows.forEach((r) => { draft[r.teamId] = { placement: r.placement, kills: r.kills, booyah: r.booyah } })
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        setLastSaved(new Date())
      } catch {}
    }, 800)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [rows, DRAFT_KEY])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows.map((r, i) => ({ ...r, originalIdx: i }))
    return rows
      .map((r, i) => ({ ...r, originalIdx: i }))
      .filter((r) => r.teamName.toLowerCase().includes(q))
  }, [rows, search])

  // Calculate total points for a row
  const calcTotal = useCallback(
    (row: RowData) => {
      const calc = calculatePoints(
        row.placement,
        row.kills,
        placementMap,
        killPointValue,
        wwcdBonus
      )
      // If booyah is manually toggled on (and placement !== 1), still give the bonus
      const booyahPts = row.booyah ? wwcdBonus : calc.wwcd
      return calc.placementPts + calc.killPts + booyahPts
    },
    [placementMap, killPointValue, wwcdBonus]
  )

  // Update a single row field
  function updateRow(index: number, field: keyof RowData, value: unknown) {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Auto-set booyah if placement is 1
      if (field === 'placement' && value === 1) {
        next[index].booyah = true
      }
      return next
    })
  }

  // Sort rows by placement (0 = unranked goes to bottom)
  function sortByPlacement() {
    setRows((prev) =>
      [...prev].sort((a, b) => {
        if (a.placement === 0 && b.placement === 0) return 0
        if (a.placement === 0) return 1
        if (b.placement === 0) return -1
        return a.placement - b.placement
      })
    )
  }

  // Keyboard navigation: Tab / Enter moves to next editable cell
  function handleKeyDown(
    e: React.KeyboardEvent,
    rowIdx: number,
    col: 'placement' | 'kills' | 'booyah'
  ) {
    const cols: ('placement' | 'kills' | 'booyah')[] = ['placement', 'kills', 'booyah']
    const colIdx = cols.indexOf(col)

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      let nextRow = rowIdx
      let nextCol = colIdx + 1
      if (nextCol >= cols.length) {
        nextCol = 0
        nextRow = rowIdx + 1
      }
      if (nextRow < rows.length) {
        const cellId: CellId = `${nextRow}-${cols[nextCol]}`
        setActiveCell(cellId)
        // Focus the input in the next cell
        requestAnimationFrame(() => {
          const el = gridRef.current?.querySelector(`[data-cell="${cellId}"]`) as
            | HTMLInputElement
            | HTMLButtonElement
            | null
          el?.focus()
        })
      }
    }
  }

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    const used = new Set<number>()
    for (const row of rows) {
      if (row.placement > 0) {
        if (used.has(row.placement)) {
          errors.push(`Placement #${row.placement} digunakan lebih dari satu tim`)
        }
        used.add(row.placement)
      }
    }
    const unranked = rows.filter((r) => r.placement === 0).length
    if (unranked > 0 && unranked < rows.length) {
      errors.push(`${unranked} tim belum memiliki placement`)
    }
    return errors
  }, [rows])

  // Total kills across all teams
  const totalKills = useMemo(() => rows.reduce((sum, r) => sum + r.kills, 0), [rows])

  async function handleSave() {
    if (validationErrors.length > 0) return
    setSubmitting(true)
    try {
      const results = rows.map((r) => ({
        team_id: r.teamId,
        placement: r.placement,
        kills: r.kills,
        is_wwcd: r.booyah,
      }))
      await onSave(results)
      // Clear draft after successful save
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
    } finally {
      setSubmitting(false)
    }
  }

  // Click outside to deactivate cell
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setActiveCell(null)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari tim atau sekolah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-stone-200 bg-white pl-8 pr-3 text-xs text-stone-700 placeholder:text-stone-400 outline-none focus:border-porjar-red focus:ring-1 focus:ring-porjar-red/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <div className="shrink-0 text-xs text-stone-400 whitespace-nowrap">
          {filteredRows.length !== rows.length
            ? `${filteredRows.length}/${rows.length} tim`
            : `${rows.length} tim`}
          {' '}&middot; Kill: {killPointValue}pt
          {wwcdBonus > 0 && ` · Booyah: +${wwcdBonus}pt`}
        </div>
        <Button
          variant="outline"
          onClick={sortByPlacement}
          className="h-8 shrink-0 border-stone-300 text-stone-600 text-xs px-2"
        >
          <SortAscending size={12} className="mr-1" />
          Sort
        </Button>
      </div>

      {/* Validation */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          {validationErrors.map((err, i) => (
            <p key={i} className="flex items-center gap-1.5 text-xs text-red-600">
              <Warning size={12} weight="fill" />
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Grid */}
      <div
        ref={gridRef}
        className="rounded-lg border border-stone-300 bg-white overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <th className="w-10 border-b border-r border-stone-300 px-2 py-2 text-center">
                  #
                </th>
                <th className="min-w-[140px] border-b border-r border-stone-300 px-3 py-2 text-left">
                  Tim
                </th>
                <th className="w-24 border-b border-r border-stone-300 px-2 py-2 text-center">
                  Placement
                </th>
                <th className="w-20 border-b border-r border-stone-300 px-2 py-2 text-center">
                  Kills
                </th>
                <th className="w-20 border-b border-r border-stone-300 px-2 py-2 text-center">
                  Booyah
                </th>
                <th className="w-24 border-b border-stone-300 px-2 py-2 text-center">
                  Total Poin
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, displayIdx) => {
                const idx = row.originalIdx
                const total = calcTotal(row)
                const isFirst = row.placement === 1
                const isTop3 = row.placement >= 1 && row.placement <= 3

                return (
                  <tr
                    key={row.teamId}
                    className={cn(
                      'h-10 sm:h-8 text-sm transition-colors',
                      isFirst && 'bg-amber-50',
                      isTop3 && !isFirst && 'bg-yellow-50/40',
                      !isTop3 && displayIdx % 2 === 0 && 'bg-white',
                      !isTop3 && displayIdx % 2 !== 0 && 'bg-stone-50/50'
                    )}
                  >
                    {/* Row number */}
                    <td className="border-b border-r border-stone-200 px-2 text-center text-xs text-stone-400 tabular-nums">
                      {idx + 1}
                    </td>

                    {/* Team name (read-only) */}
                    <td className="border-b border-r border-stone-200 px-3">
                      <div className="flex items-center gap-1.5 truncate">
                        {isFirst && (
                          <Trophy
                            size={14}
                            weight="fill"
                            className="shrink-0 text-amber-500"
                          />
                        )}
                        <span
                          className={cn(
                            'truncate text-sm',
                            isFirst
                              ? 'font-bold text-amber-700'
                              : isTop3
                                ? 'font-semibold text-stone-800'
                                : 'text-stone-700'
                          )}
                        >
                          {row.teamName}
                        </span>
                      </div>
                    </td>

                    {/* Placement */}
                    <td
                      className={cn(
                        'border-b border-r border-stone-200 p-0',
                        activeCell === `${idx}-placement` && 'ring-2 ring-inset ring-porjar-red'
                      )}
                    >
                      <select
                        data-cell={`${idx}-placement`}
                        value={row.placement}
                        onChange={(e) =>
                          updateRow(idx, 'placement', parseInt(e.target.value) || 0)
                        }
                        onFocus={() => setActiveCell(`${idx}-placement`)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'placement')}
                        className={cn(
                          'h-10 sm:h-8 w-full border-0 bg-transparent text-center text-sm outline-none cursor-pointer',
                          'focus:bg-porjar-red/5',
                          row.placement === 0 ? 'text-stone-400' : 'text-stone-900 font-medium'
                        )}
                      >
                        <option value={0}>-</option>
                        {Array.from({ length: teams.length }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            #{n}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Kills */}
                    <td
                      className={cn(
                        'border-b border-r border-stone-200 p-0',
                        activeCell === `${idx}-kills` && 'ring-2 ring-inset ring-porjar-red'
                      )}
                    >
                      <input
                        data-cell={`${idx}-kills`}
                        type="number"
                        min={0}
                        value={row.kills || ''}
                        placeholder="0"
                        onChange={(e) =>
                          updateRow(idx, 'kills', parseInt(e.target.value) || 0)
                        }
                        onFocus={() => setActiveCell(`${idx}-kills`)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 'kills')}
                        className={cn(
                          'h-10 sm:h-8 w-full border-0 bg-transparent text-center text-sm outline-none tabular-nums',
                          'focus:bg-porjar-red/5',
                          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                          row.kills > 0 ? 'text-stone-900 font-medium' : 'text-stone-400'
                        )}
                      />
                    </td>

                    {/* Booyah toggle */}
                    <td
                      className={cn(
                        'border-b border-r border-stone-200 p-0',
                        activeCell === `${idx}-booyah` && 'ring-2 ring-inset ring-porjar-red'
                      )}
                    >
                      <button
                        data-cell={`${idx}-booyah`}
                        type="button"
                        onClick={() => updateRow(idx, 'booyah', !row.booyah)}
                        onFocus={() => setActiveCell(`${idx}-booyah`)}
                        onKeyDown={(e) => {
                          if (e.key === ' ') {
                            e.preventDefault()
                            updateRow(idx, 'booyah', !row.booyah)
                          } else {
                            handleKeyDown(e, idx, 'booyah')
                          }
                        }}
                        className={cn(
                          'flex h-10 sm:h-8 w-full items-center justify-center outline-none transition-colors',
                          'focus:bg-porjar-red/5'
                        )}
                        title={row.booyah ? 'Booyah aktif' : 'Klik untuk toggle Booyah'}
                      >
                        <Trophy
                          size={18}
                          weight={row.booyah ? 'fill' : 'regular'}
                          className={cn(
                            'transition-colors',
                            row.booyah ? 'text-amber-500' : 'text-stone-300'
                          )}
                        />
                      </button>
                    </td>

                    {/* Total points (read-only) */}
                    <td className="border-b border-stone-200 px-2 text-center">
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          total > 0 ? 'text-porjar-red' : 'text-stone-300'
                        )}
                      >
                        {total}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-stone-400">
                    Tidak ada tim yang cocok dengan &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer: totals */}
            <tfoot>
              <tr className="bg-stone-100 text-xs font-semibold text-stone-600">
                <td
                  colSpan={3}
                  className="border-t border-stone-300 px-3 py-2 text-right"
                >
                  Total
                </td>
                <td className="border-t border-stone-300 px-2 py-2 text-center tabular-nums">
                  {totalKills}
                </td>
                <td className="border-t border-stone-300 px-2 py-2 text-center tabular-nums">
                  {rows.filter((r) => r.booyah).length > 0
                    ? rows.filter((r) => r.booyah).length
                    : '-'}
                </td>
                <td className="border-t border-stone-300 px-2 py-2 text-center tabular-nums font-bold text-porjar-red">
                  {rows.reduce((sum, r) => sum + calcTotal(r), 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Save button + draft indicator */}
      <div className="flex flex-col gap-1.5">
        <Button
          onClick={handleSave}
          disabled={submitting || validationErrors.length > 0}
          className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white"
        >
          <FloppyDisk size={16} className="mr-1.5" />
          {submitting ? 'Menyimpan...' : 'Simpan Hasil'}
        </Button>
        {lastSaved && (
          <p className="text-center text-[10px] text-stone-400">
            Draft tersimpan otomatis ·{' '}
            {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
