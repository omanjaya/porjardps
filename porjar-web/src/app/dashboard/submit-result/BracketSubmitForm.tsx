'use client'

import { useState } from 'react'
import { PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react'
import { ScreenshotUploader } from '@/components/modules/submission/ScreenshotUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface BracketSubmitFormProps {
  teamAName: string
  teamBName: string
  bestOf?: number
  gameSlug?: string
  scoreA: string
  setScoreA: (v: string) => void
  scoreB: string
  setScoreB: (v: string) => void
  onScreenshotsChange: (urls: string[]) => void
  submitting: boolean
  onSubmit: () => void
}

function getBracketMaxScreenshots(gameSlug?: string, bestOf?: number): number {
  switch (gameSlug) {
    case 'ml': return 1
    case 'hok': return bestOf ?? 3
    case 'efootball': return 1
    default: return 5
  }
}

function getScoreLabel(gameSlug?: string, bestOf?: number): string {
  if (gameSlug === 'efootball') return 'Skor Gol'
  return `Skor Pertandingan${bestOf ? ` (BO${bestOf})` : ''}`
}

function getScreenshotHint(gameSlug?: string, bestOf?: number): string | null {
  switch (gameSlug) {
    case 'ml': return 'Upload 1 screenshot hasil pertandingan'
    case 'hok': return `Upload ${bestOf ?? 3} screenshot (1 per game)`
    case 'efootball': return 'Upload 1 screenshot hasil pertandingan'
    default: return null
  }
}

function getWinnerFromScores(scoreA: string, scoreB: string): 'team_a' | 'team_b' | null {
  const a = parseInt(scoreA)
  const b = parseInt(scoreB)
  if (isNaN(a) || isNaN(b) || a === b) return null
  return a > b ? 'team_a' : 'team_b'
}

export function BracketSubmitForm({
  teamAName,
  teamBName,
  bestOf,
  gameSlug,
  scoreA,
  setScoreA,
  scoreB,
  setScoreB,
  onScreenshotsChange,
  submitting,
  onSubmit,
}: BracketSubmitFormProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const maxScreenshots = getBracketMaxScreenshots(gameSlug, bestOf)
  const scoreLabel = getScoreLabel(gameSlug, bestOf)
  const screenshotHint = getScreenshotHint(gameSlug, bestOf)
  const winnerSide = getWinnerFromScores(scoreA, scoreB)

  const handleSubmitClick = () => {
    if (!winnerSide) return
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    onSubmit()
  }

  return (
    <div className="space-y-5">
      {/* Score */}
      <div>
        <label className="mb-2 block text-sm font-medium text-esi-text">
          {scoreLabel}
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <label className={cn(
              'mb-1 block text-xs truncate font-semibold transition-colors',
              winnerSide === 'team_a' ? 'text-esi-red' : 'text-esi-muted'
            )} title={teamAName}>
              {teamAName} {winnerSide === 'team_a' && '🏆'}
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={99}
              placeholder="0"
              value={scoreA}
              onChange={e => setScoreA(e.target.value)}
              onFocus={e => e.target.select()}
              className={cn(
                'h-16 border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 text-center text-3xl font-bold focus:ring-esi-red/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                winnerSide === 'team_a' ? 'border-esi-red focus:border-esi-red ring-1 ring-esi-red/30' : 'focus:border-esi-red'
              )}
            />
          </div>
          <span className="mt-5 text-lg font-bold text-esi-muted shrink-0">-</span>
          <div className="flex-1 min-w-0">
            <label className={cn(
              'mb-1 block text-xs truncate font-semibold transition-colors',
              winnerSide === 'team_b' ? 'text-esi-red' : 'text-esi-muted'
            )} title={teamBName}>
              {teamBName} {winnerSide === 'team_b' && '🏆'}
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={99}
              placeholder="0"
              value={scoreB}
              onChange={e => setScoreB(e.target.value)}
              onFocus={e => e.target.select()}
              className={cn(
                'h-16 border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-100 text-center text-3xl font-bold focus:ring-esi-red/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                winnerSide === 'team_b' ? 'border-esi-red focus:border-esi-red ring-1 ring-esi-red/30' : 'focus:border-esi-red'
              )}
            />
          </div>
        </div>
        {winnerSide && (
          <p className="mt-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
            Pemenang otomatis: {winnerSide === 'team_a' ? teamAName : teamBName}
          </p>
        )}
      </div>

      {/* Screenshots */}
      <div>
        <label className="mb-2 block text-sm font-medium text-esi-text">
          Screenshot Bukti
        </label>
        {screenshotHint && (
          <p className="mb-2 text-xs text-esi-muted">{screenshotHint}</p>
        )}
        <ScreenshotUploader onUpload={onScreenshotsChange} maxFiles={maxScreenshots} />
      </div>

      {/* Confirmation overlay */}
      {showConfirm && winnerSide && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <WarningCircle size={18} weight="fill" className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-stone-700 dark:text-zinc-300">
              <p className="font-semibold mb-1">Konfirmasi Submission</p>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mb-2">
                Pastikan data berikut sudah benar. Submission yang sudah dikirim hanya bisa diubah jika ditolak admin.
              </p>
              <div className="bg-white dark:bg-zinc-800 rounded-md border border-stone-200 dark:border-zinc-700 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-zinc-400">Skor</span>
                  <span className="font-bold text-stone-900 dark:text-zinc-100">{teamAName} {scoreA} - {scoreB} {teamBName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-zinc-400">Pemenang</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {winnerSide === 'team_a' ? teamAName : teamBName}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-6">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1 min-h-[48px]"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 min-h-[48px] bg-esi-red text-white hover:brightness-110"
            >
              {submitting ? 'Mengirim...' : 'Ya, Kirim Sekarang'}
            </Button>
          </div>
        </div>
      )}

      {!showConfirm && (
        <Button
          onClick={handleSubmitClick}
          disabled={submitting || !winnerSide}
          className="w-full min-h-[52px] text-base font-semibold bg-esi-red text-white hover:brightness-110"
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
      )}
    </div>
  )
}
