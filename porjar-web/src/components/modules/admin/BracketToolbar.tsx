'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TreeStructure,
  ArrowCounterClockwise,
  Lightning,
  CheckCircle,
  Clock,
} from '@phosphor-icons/react'

interface BracketToolbarProps {
  matchCount: number
  teamCount: number
  generating: boolean
  stats: { pending: number; live: number; completed: number; total: number }
  rounds: number[]
  scheduleRound: number | null
  setScheduleRound: (v: number | null) => void
  scheduleRoundDatetime: string
  setScheduleRoundDatetime: (v: string) => void
  schedulingRound: boolean
  onGenerateClick: () => void
  onResetClick: () => void
  onBoConfigClick: () => void
  onScheduleRound: () => void
}

export function BracketToolbar({
  matchCount,
  teamCount,
  generating,
  stats,
  rounds,
  scheduleRound,
  setScheduleRound,
  scheduleRoundDatetime,
  setScheduleRoundDatetime,
  schedulingRound,
  onGenerateClick,
  onResetClick,
  onBoConfigClick,
  onScheduleRound,
}: BracketToolbarProps) {
  return (
    <div className="sticky top-14 z-20 rounded-xl border border-stone-200 bg-white/80 backdrop-blur-xl p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Generate / Reset buttons */}
        <div className="flex items-center gap-2">
          {matchCount === 0 ? (
            <Button
              size="sm"
              onClick={onGenerateClick}
              disabled={generating || teamCount < 2}
            >
              <TreeStructure size={14} className="mr-1.5" />
              Generate Bracket
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onResetClick}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <ArrowCounterClockwise size={14} className="mr-1.5" />
              Reset Bracket
            </Button>
          )}
        </div>

        {/* Divider */}
        {matchCount > 0 && (
          <div className="hidden sm:block h-6 w-px bg-stone-200" />
        )}

        {/* Status indicators */}
        {matchCount > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-600">
              <Clock size={12} />
              {stats.pending} pending
            </span>
            <span className="flex items-center gap-1.5 text-porjar-red">
              <Lightning size={12} weight="fill" />
              {stats.live} live
            </span>
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle size={12} />
              {stats.completed} selesai
            </span>
          </div>
        )}

        {/* Round BO config */}
        {matchCount > 0 && (
          <>
            <div className="hidden sm:block h-6 w-px bg-stone-200" />
            <Button size="sm" variant="outline" onClick={onBoConfigClick} className="border-stone-200 text-stone-700 text-xs">
              BO Config
            </Button>
          </>
        )}

        {/* Jadwalkan Round */}
        {matchCount > 0 && rounds.length > 0 && (
          <>
            <div className="hidden sm:block h-6 w-px bg-stone-200" />
            <div className="flex items-center gap-2">
              <Select
                value={scheduleRound ? String(scheduleRound) : ''}
                onValueChange={(val) => {
                  setScheduleRound(parseInt(val as string))
                  setScheduleRoundDatetime('')
                }}
              >
                <SelectTrigger className="w-auto h-8 bg-white border-stone-200 text-stone-700 text-xs gap-1.5">
                  <SelectValue placeholder="Jadwalkan Round..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-stone-200">
                  {rounds.map((r) => (
                    <SelectItem
                      key={r}
                      value={String(r)}
                      className="text-stone-700 text-xs focus:bg-stone-50 focus:text-stone-900"
                    >
                      Round {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scheduleRound && (
                <>
                  <input
                    type="datetime-local"
                    value={scheduleRoundDatetime}
                    onChange={(e) => setScheduleRoundDatetime(e.target.value)}
                    className="h-8 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-porjar-red/30 focus:border-porjar-red"
                  />
                  <Button
                    size="sm"
                    onClick={onScheduleRound}
                    disabled={schedulingRound || !scheduleRoundDatetime}
                    className="h-8 bg-porjar-red hover:bg-porjar-red-dark text-white text-xs"
                  >
                    {schedulingRound ? 'Menyimpan...' : 'Jadwalkan'}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
