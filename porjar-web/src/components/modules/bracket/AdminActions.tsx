import { Button } from '@/components/ui/button'
import {
  Play,
  CheckCircle,
  PencilSimple,
  ArrowRight,
} from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'

interface AdminActionsProps {
  match: BracketMatch
  isLive: boolean
  isCompleted: boolean
  isPending: boolean
  isSeriesDecided: boolean
  onSetLive?: (matchId: string) => void
  onComplete?: (matchId: string, winnerId: string) => void
  onStartScoreInput: () => void
}

export function AdminActions({
  match,
  isLive,
  isCompleted,
  isPending,
  isSeriesDecided,
  onSetLive,
  onComplete,
  onStartScoreInput,
}: AdminActionsProps) {
  function handleSetLive() {
    if (!onSetLive) return
    onSetLive(match.id)
  }

  function handleComplete(winnerId: string) {
    if (!onComplete) return
    onComplete(match.id, winnerId)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-1">
        Admin Actions
      </h3>
      <div className="flex flex-col gap-2">
        {/* Set Live */}
        {isPending && match.team_a && match.team_b && (
          <Button
            size="sm"
            onClick={handleSetLive}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Play size={14} className="mr-1.5" />
            Set Live
          </Button>
        )}

        {/* Score Input */}
        {isLive && (
          <Button
            size="sm"
            variant="outline"
            onClick={onStartScoreInput}
            className="w-full border-stone-200 text-stone-700 hover:bg-stone-50"
          >
            <PencilSimple size={14} className="mr-1.5" />
            Input Skor
          </Button>
        )}

        {/* Complete Match */}
        {isLive && isSeriesDecided && match.team_a && match.team_b && (
          <div className="space-y-2">
            <span className="text-xs text-stone-500 block">
              Pilih pemenang untuk menyelesaikan pertandingan:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => handleComplete(match.team_a!.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={14} className="mr-1" />
                {match.team_a.name}
              </Button>
              <Button
                size="sm"
                onClick={() => handleComplete(match.team_b!.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={14} className="mr-1" />
                {match.team_b.name}
              </Button>
            </div>
          </div>
        )}

        {/* Advance indicator */}
        {isCompleted && match.next_match_id && (
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-500">
            <ArrowRight size={12} />
            <span>Pemenang maju ke match berikutnya</span>
          </div>
        )}
      </div>
    </div>
  )
}
