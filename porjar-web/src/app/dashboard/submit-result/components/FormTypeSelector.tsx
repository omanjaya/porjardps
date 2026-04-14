'use client'

import { ArrowLeft, GameController } from '@phosphor-icons/react'
import { BracketSubmitForm } from '../BracketSubmitForm'
import { BRSubmitForm } from '../BRSubmitForm'
import type { SubmissionData } from '@/components/modules/submission/SubmissionCard'
import type { ActiveMatch } from '../hooks/useActiveMatches'

interface Props {
  selectedMatch: ActiveMatch
  resubmittingSub: SubmissionData | null
  onBack: () => void
  // bracket
  scoreA: string
  setScoreA: (v: string) => void
  scoreB: string
  setScoreB: (v: string) => void
  // br
  placement: string
  setPlacement: (v: string) => void
  killsP1: string
  setKillsP1: (v: string) => void
  killsP2: string
  setKillsP2: (v: string) => void
  killsP3: string
  setKillsP3: (v: string) => void
  killsP4: string
  setKillsP4: (v: string) => void
  setScreenshots: (urls: string[]) => void
  submitting: boolean
  onSubmitBracket: () => void
  onSubmitBR: () => void
}

export function FormTypeSelector({
  selectedMatch,
  resubmittingSub,
  onBack,
  scoreA, setScoreA, scoreB, setScoreB,
  placement, setPlacement,
  killsP1, setKillsP1, killsP2, setKillsP2, killsP3, setKillsP3, killsP4, setKillsP4,
  setScreenshots, submitting, onSubmitBracket, onSubmitBR,
}: Props) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center gap-2 -ml-2 px-2 rounded-lg text-sm font-semibold text-esi-muted hover:text-esi-red transition-colors"
      >
        <ArrowLeft size={18} />
        Kembali ke daftar pertandingan
      </button>

      <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm">
        <div className="mb-4 sm:mb-6 rounded-lg bg-esi-bg p-4">
          <div className="flex items-center gap-2 mb-2">
            <GameController size={18} weight="duotone" className="text-esi-red" />
            <span className="text-xs font-semibold uppercase tracking-wider text-esi-muted">
              {selectedMatch.game_name}
            </span>
          </div>
          {selectedMatch.type === 'bracket' || selectedMatch.type === 'group' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-sm sm:text-lg font-bold text-esi-text">{selectedMatch.team_a_name}</span>
              <span className="text-xs sm:text-lg font-bold text-esi-muted">vs</span>
              <span className="text-sm sm:text-lg font-bold text-esi-text">{selectedMatch.team_b_name}</span>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-esi-text">
                {selectedMatch.lobby_name ?? 'Lobby Battle Royale'}
              </p>
              {(selectedMatch.num_maps ?? 1) > 1 && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Map {selectedMatch.current_map ?? 1} dari {selectedMatch.num_maps}
                </p>
              )}
            </div>
          )}
        </div>

        {resubmittingSub?.status === 'rejected' && resubmittingSub.rejection_reason && (
          <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-3 mb-4">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Alasan Penolakan</p>
            <p className="text-sm text-red-600 dark:text-red-400">{resubmittingSub.rejection_reason}</p>
          </div>
        )}

        {(selectedMatch.type === 'bracket' || selectedMatch.type === 'group') && (
          <BracketSubmitForm
            teamAName={selectedMatch.team_a_name}
            teamBName={selectedMatch.team_b_name}
            bestOf={selectedMatch.best_of}
            gameSlug={selectedMatch.game_slug}
            scoreA={scoreA}
            setScoreA={setScoreA}
            scoreB={scoreB}
            setScoreB={setScoreB}
            onScreenshotsChange={setScreenshots}
            submitting={submitting}
            onSubmit={onSubmitBracket}
          />
        )}

        {selectedMatch.type === 'battle_royale' && (
          <BRSubmitForm
            gameSlug={selectedMatch.game_slug}
            mapName={selectedMatch.map_names?.[(selectedMatch.current_map ?? 1) - 1]}
            placement={placement}
            setPlacement={setPlacement}
            killsP1={killsP1}
            setKillsP1={setKillsP1}
            killsP2={killsP2}
            setKillsP2={setKillsP2}
            killsP3={killsP3}
            setKillsP3={setKillsP3}
            killsP4={killsP4}
            setKillsP4={setKillsP4}
            onScreenshotsChange={setScreenshots}
            submitting={submitting}
            onSubmit={onSubmitBR}
          />
        )}
      </div>
    </div>
  )
}
