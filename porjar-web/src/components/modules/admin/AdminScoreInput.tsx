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
      <div className="flex items-center justify-between rounded-xl bg-porjar-bg px-4 py-3">
        <span className="text-sm font-semibold text-stone-900">
          {match.team_a?.name ?? 'TBD'}
        </span>
        <span className="text-lg font-bold text-porjar-red tabular-nums">
          {totalA} - {totalB}
        </span>
        <span className="text-sm font-semibold text-stone-900">
          {match.team_b?.name ?? 'TBD'}
        </span>
      </div>

      {/* Per-game inputs */}
      <div className="space-y-3">
        {games.map((game, i) => (
          <div
            key={game.game_number}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-sm"
          >
            <span className="w-20 text-xs font-semibold uppercase tracking-wider text-stone-400">
              Game {game.game_number}
            </span>
            <div className="flex flex-1 items-center justify-center gap-3">
              <Input
                type="number"
                min={0}
                value={game.score_a}
                onChange={(e) => updateGame(i, 'score_a', parseInt(e.target.value) || 0)}
                className="w-16 text-center bg-white border-stone-300 text-stone-900 focus:border-porjar-red"
              />
              <span className="text-xs font-bold text-stone-300">VS</span>
              <Input
                type="number"
                min={0}
                value={game.score_b}
                onChange={(e) => updateGame(i, 'score_b', parseInt(e.target.value) || 0)}
                className="w-16 text-center bg-white border-stone-300 text-stone-900 focus:border-porjar-red"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <Button onClick={() => setConfirmOpen(true)} className="w-full bg-porjar-red hover:bg-porjar-red-dark text-white">
        Simpan Skor
      </Button>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <WarningCircle size={20} className="text-amber-500" />
              Konfirmasi Skor
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              Pastikan skor sudah benar sebelum menyimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-porjar-bg px-4 py-3 text-center">
            <p className="text-sm text-stone-600">
              {match.team_a?.name ?? 'TBD'}{' '}
              <span className="text-lg font-bold text-porjar-red">
                {totalA} - {totalB}
              </span>{' '}
              {match.team_b?.name ?? 'TBD'}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-stone-300 text-stone-600"
            >
              Batal
            </Button>
            <Button onClick={handleConfirm} disabled={submitting} className="bg-porjar-red hover:bg-porjar-red-dark text-white">
              {submitting ? 'Menyimpan...' : 'Ya, Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
