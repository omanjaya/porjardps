'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BracketMatch } from '@/types'

interface AdminScoreInputProps {
  match: BracketMatch
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void
  onCancel: () => void
}

export function AdminScoreInput({
  match,
  onScoreUpdate,
  onCancel,
}: AdminScoreInputProps) {
  const [gameScores, setGameScores] = useState<{ score_a: number; score_b: number }[]>(() =>
    Array.from({ length: match.best_of }, (_, i) => ({
      score_a: match.games?.[i]?.score_a ?? 0,
      score_b: match.games?.[i]?.score_b ?? 0,
    }))
  )
  const [submitting, setSubmitting] = useState(false)

  function updateGameScore(index: number, field: 'score_a' | 'score_b', value: number) {
    setGameScores((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: Math.max(0, value) }
      return next
    })
  }

  async function handleScoreSubmit() {
    setSubmitting(true)
    try {
      const totalA = gameScores.reduce((s, g) => s + (g.score_a > g.score_b ? 1 : 0), 0)
      const totalB = gameScores.reduce((s, g) => s + (g.score_b > g.score_a ? 1 : 0), 0)
      await onScoreUpdate(match.id, totalA, totalB)
      onCancel()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-1">
        Input Skor
      </h3>
      {gameScores.map((gs, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5"
        >
          <span className="w-16 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Game {i + 1}
          </span>
          <div className="flex flex-1 items-center justify-center gap-3">
            <Input
              type="number"
              min={0}
              value={gs.score_a}
              onChange={(e) =>
                updateGameScore(i, 'score_a', parseInt(e.target.value) || 0)
              }
              className="w-16 text-center bg-white border-stone-200 text-stone-800"
            />
            <span className="text-xs font-bold text-stone-400">VS</span>
            <Input
              type="number"
              min={0}
              value={gs.score_b}
              onChange={(e) =>
                updateGameScore(i, 'score_b', parseInt(e.target.value) || 0)
              }
              className="w-16 text-center bg-white border-stone-200 text-stone-800"
            />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1 border-stone-200 text-stone-700"
        >
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleScoreSubmit}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Skor'}
        </Button>
      </div>
    </div>
  )
}
