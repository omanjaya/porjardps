'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, WarningCircle, Info } from '@phosphor-icons/react'
import { GAME_CONFIG } from '@/constants/games'
import type { Tournament, GameSlug } from '@/types'
import type { RoundConfig } from '../lib/scheduleGenerator'

interface Props {
  tournaments: Tournament[]
  tournamentId: string
  tournament: Tournament | undefined
  bracketLoading: boolean
  isBR: boolean
  hasBracket: boolean
  bracketMatches: { length: number }
  roundConfigs: RoundConfig[]
  onSelect: (id: string | null) => void
}

export function TournamentStep({
  tournaments,
  tournamentId,
  tournament,
  bracketLoading,
  isBR,
  hasBracket,
  bracketMatches,
  roundConfigs,
  onSelect,
}: Props) {
  const gameSlug = tournament?.game?.slug as GameSlug | undefined
  const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null

  return (
    <div className="space-y-4 py-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-500 dark:text-zinc-400">
          Pilih Turnamen <span className="text-red-500">*</span>
        </label>
        <Select value={tournamentId} onValueChange={onSelect}>
          <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-600 text-stone-900 dark:text-zinc-100">
            {tournament ? (
              <div className="flex items-center gap-2">
                {(() => { const gs = tournament.game?.slug as GameSlug | undefined; const gc = gs ? GAME_CONFIG[gs] : null; return gc?.logo ? <img src={gc.logo} alt="" className="h-4 w-4 object-contain" /> : null })()}
                <span>{tournament.name}</span>
              </div>
            ) : (
              <SelectValue placeholder="Pilih turnamen..." />
            )}
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => {
              const gs = t.game?.slug as GameSlug | undefined
              const gc = gs ? GAME_CONFIG[gs] : null
              return (
                <SelectItem key={t.id} value={t.id} className="text-stone-900 dark:text-zinc-100">
                  <div className="flex items-center gap-2">
                    {gc?.logo && (
                      <img src={gc.logo} alt="" className="h-4 w-4 object-contain" />
                    )}
                    {t.name}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {bracketLoading && (
        <div className="space-y-2 rounded-lg border border-stone-100 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-3">
          <Skeleton className="h-3 w-48 bg-stone-200" />
          <Skeleton className="h-3 w-32 bg-stone-200" />
        </div>
      )}

      {!bracketLoading && tournamentId && (
        <>
          {isBR ? (
            <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-700">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                Turnamen Battle Royale tidak memiliki bracket. Gunakan{' '}
                <strong>Tambah Manual</strong> atau generate dari halaman lobby.
              </span>
            </div>
          ) : hasBracket ? (
            <div className="flex gap-2.5 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-700">
              <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
              <div>
                Bracket ditemukan:{' '}
                <strong>{roundConfigs.length} round</strong> ·{' '}
                <strong>{bracketMatches.length} pertandingan</strong>
                {gameConfig && (
                  <span className="ml-2 text-xs text-green-600">
                    · {tournament?.game?.name}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700">
              <WarningCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                Bracket belum dibuat untuk turnamen ini. Jadwal tidak akan terhubung ke
                pertandingan — buat bracket dulu untuk hasil terbaik.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
