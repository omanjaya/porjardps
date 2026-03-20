'use client'

import { PaperPlaneTilt } from '@phosphor-icons/react'
import { ScreenshotUploader } from '@/components/modules/submission/ScreenshotUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface BracketSubmitFormProps {
  teamAName: string
  teamBName: string
  bestOf?: number
  winner: 'team_a' | 'team_b' | ''
  setWinner: (v: 'team_a' | 'team_b' | '') => void
  scoreA: string
  setScoreA: (v: string) => void
  scoreB: string
  setScoreB: (v: string) => void
  onScreenshotsChange: (urls: string[]) => void
  submitting: boolean
  onSubmit: () => void
}

export function BracketSubmitForm({
  teamAName,
  teamBName,
  bestOf,
  winner,
  setWinner,
  scoreA,
  setScoreA,
  scoreB,
  setScoreB,
  onScreenshotsChange,
  submitting,
  onSubmit,
}: BracketSubmitFormProps) {
  return (
    <div className="space-y-5">
      {/* Winner selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-porjar-text">
          Siapa pemenang?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setWinner('team_a')}
            className={cn(
              'rounded-lg border-2 p-3 text-sm font-semibold transition-all',
              winner === 'team_a'
                ? 'border-porjar-red bg-porjar-red/5 text-porjar-red'
                : 'border-stone-200 text-porjar-text hover:border-stone-300'
            )}
          >
            {teamAName}
          </button>
          <button
            onClick={() => setWinner('team_b')}
            className={cn(
              'rounded-lg border-2 p-3 text-sm font-semibold transition-all',
              winner === 'team_b'
                ? 'border-porjar-red bg-porjar-red/5 text-porjar-red'
                : 'border-stone-200 text-porjar-text hover:border-stone-300'
            )}
          >
            {teamBName}
          </button>
        </div>
      </div>

      {/* Score */}
      <div>
        <label className="mb-2 block text-sm font-medium text-porjar-text">
          Skor Pertandingan {bestOf ? `(BO${bestOf})` : ''}
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-porjar-muted">{teamAName}</label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={scoreA}
              onChange={e => setScoreA(e.target.value)}
              onFocus={e => e.target.select()}
              className="border-stone-200 bg-white text-center text-lg font-bold focus:border-porjar-red focus:ring-porjar-red/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <span className="mt-5 text-lg font-bold text-porjar-muted">-</span>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-porjar-muted">{teamBName}</label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={scoreB}
              onChange={e => setScoreB(e.target.value)}
              className="border-stone-200 bg-white text-center text-lg font-bold focus:border-porjar-red focus:ring-porjar-red/20"
            />
          </div>
        </div>
      </div>

      {/* Screenshots */}
      <div>
        <label className="mb-2 block text-sm font-medium text-porjar-text">
          Screenshot Bukti
        </label>
        <ScreenshotUploader onUpload={onScreenshotsChange} maxFiles={5} />
      </div>

      <Button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-porjar-red text-white hover:brightness-110"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Mengirim...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <PaperPlaneTilt size={18} weight="fill" />
            Kirim Hasil
          </span>
        )}
      </Button>
    </div>
  )
}
