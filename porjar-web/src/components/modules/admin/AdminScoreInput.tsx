'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { WarningCircle } from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'

interface AdminScoreInputProps {
  match: BracketMatch
  bestOf: number
  onSubmit: (games: GameScore[]) => Promise<void>
}

export interface GameScore {
  game_number: number
  score_a: number
  score_b: number
}

export function AdminScoreInput({ match, bestOf, onSubmit }: AdminScoreInputProps) {
  const [games, setGames] = useState<GameScore[]>(() =>
    Array.from({ length: bestOf }, (_, i) => ({
      game_number: i + 1,
      score_a: match.games?.[i]?.score_a ?? 0,
      score_b: match.games?.[i]?.score_b ?? 0,
    }))
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function updateGame(index: number, field: 'score_a' | 'score_b', value: number) {
    setGames((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: Math.max(0, value) }
      return next
    })
  }

  const totalA = games.reduce((sum, g) => sum + (g.score_a > g.score_b ? 1 : 0), 0)
  const totalB = games.reduce((sum, g) => sum + (g.score_b > g.score_a ? 1 : 0), 0)

  async function handleConfirm() {
    setSubmitting(true)
    try {
      await onSubmit(games)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Match info header */}
      <div className="flex items-center justify-between rounded-xl bg-esi-bg px-4 py-3">
        <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
          {match.team_a?.name ?? 'TBD'}
        </span>
        <span className="text-lg font-bold text-esi-red tabular-nums">
          {totalA} - {totalB}
        </span>
        <span className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
          {match.team_b?.name ?? 'TBD'}
        </span>
      </div>

      {/* Per-game inputs */}
      <div className="space-y-3">
        {games.map((game, i) => (
          <div
            key={game.game_number}
            className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 shadow-sm"
          >
            <span className="w-20 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
              Game {game.game_number}
            </span>
            <div className="flex flex-1 items-center justify-center gap-3">
              <Input
                type="number"
                min={0}
                value={game.score_a}
                onChange={(e) => updateGame(i, 'score_a', e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-16 text-center bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red"
              />
              <span className="text-xs font-bold text-stone-300 dark:text-zinc-600">VS</span>
              <Input
                type="number"
                min={0}
                value={game.score_b}
                onChange={(e) => updateGame(i, 'score_b', e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-16 text-center bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100 focus:border-esi-red"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <Button onClick={() => setConfirmOpen(true)} className="w-full bg-esi-red hover:bg-esi-red-dark text-white">
        Simpan Skor
      </Button>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900 dark:text-zinc-100">
              <WarningCircle size={20} className="text-amber-500" />
              Konfirmasi Skor
            </DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-zinc-400">
              Pastikan skor sudah benar sebelum menyimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-esi-bg px-4 py-3 text-center">
            <p className="text-sm text-stone-600 dark:text-zinc-400">
              {match.team_a?.name ?? 'TBD'}{' '}
              <span className="text-lg font-bold text-esi-red">
                {totalA} - {totalB}
              </span>{' '}
              {match.team_b?.name ?? 'TBD'}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
            >
              Batal
            </Button>
            <Button onClick={handleConfirm} disabled={submitting} className="bg-esi-red hover:bg-esi-red-dark text-white">
              {submitting ? 'Menyimpan...' : 'Ya, Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
