'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Tournament } from '@/types'
import { STEP_LABELS, STEPS } from './schedule-generator/lib/scheduleGenerator'
import { useScheduleForm } from './schedule-generator/hooks/useScheduleForm'
import { useScheduleGeneration } from './schedule-generator/hooks/useScheduleGeneration'
import { TournamentStep } from './schedule-generator/steps/TournamentStep'
import { SettingsStep } from './schedule-generator/steps/SettingsStep'
import { RoundConfigStep } from './schedule-generator/steps/RoundConfigStep'
import { PreviewStep } from './schedule-generator/steps/PreviewStep'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  tournaments: Tournament[]
  onSaved: () => void
}

export function ScheduleGeneratorDialog({ open, onOpenChange, tournaments, onSaved }: Props) {
  const form = useScheduleForm(open)
  const actions = useScheduleGeneration(form, tournaments, onSaved, onOpenChange)

  const {
    step, setStep,
    tournamentId,
    bracketLoading,
    bracketMatches,
    hasBracket,
    isBR,
    titlePrefix, setTitlePrefix,
    venue, setVenue,
    durationMinStr, setDurationMinStr,
    breakMinStr, setBreakMinStr,
    durationMin, breakMin,
    roundConfigs,
    entries,
    saving,
    saveProgress,
    configIsValid,
  } = form

  const tournament = tournaments.find((t) => t.id === tournamentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 transition-all max-h-[90vh] flex flex-col overflow-hidden',
          step === 'preview' ? 'sm:max-w-5xl' : step === 'config' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-stone-900 dark:text-zinc-100">Generate Jadwal dari Bracket</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 pt-1">
            {STEPS.map((s, idx) => {
              const stepIdx = STEPS.indexOf(step)
              const isActive = s === step
              const isDone = idx < stepIdx
              return (
                <div key={s} className="flex items-center gap-1.5">
                  {idx > 0 && <div className="h-px w-5 bg-stone-200" />}
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-esi-red text-white'
                        : isDone
                        ? 'bg-green-100 text-green-700'
                        : 'bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500'
                    )}
                  >
                    {STEP_LABELS[idx]}
                  </span>
                </div>
              )
            })}
          </div>
        </DialogHeader>

        {step === 'tournament' && (
          <TournamentStep
            tournaments={tournaments}
            tournamentId={tournamentId}
            tournament={tournament}
            bracketLoading={bracketLoading}
            isBR={isBR}
            hasBracket={hasBracket}
            bracketMatches={bracketMatches}
            roundConfigs={roundConfigs}
            onSelect={actions.handleSelectTournament}
          />
        )}

        {step === 'config' && (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto py-2 pr-1">
            <SettingsStep
              titlePrefix={titlePrefix}
              setTitlePrefix={setTitlePrefix}
              venue={venue}
              setVenue={setVenue}
              durationMinStr={durationMinStr}
              setDurationMinStr={setDurationMinStr}
              breakMinStr={breakMinStr}
              setBreakMinStr={setBreakMinStr}
            />
            <RoundConfigStep
              roundConfigs={roundConfigs}
              durationMin={durationMin}
              breakMin={breakMin}
              updateRoundConfig={actions.updateRoundConfig}
            />
          </div>
        )}

        {step === 'preview' && (
          <PreviewStep
            entries={entries}
            roundConfigs={roundConfigs}
            saving={saving}
            saveProgress={saveProgress}
            updateEntry={actions.updateEntry}
            handleTimeChange={actions.handleTimeChange}
            removeEntry={actions.removeEntry}
          />
        )}

        {/* Footer */}
        <DialogFooter className="flex-row items-center justify-between gap-2">
          <div>
            {step !== 'tournament' && (
              <Button
                variant="outline"
                onClick={() => setStep(step === 'preview' ? 'config' : 'tournament')}
                className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
                disabled={saving}
              >
                <ArrowLeft size={14} className="mr-1" />
                Kembali
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-zinc-400"
              disabled={saving}
            >
              Batal
            </Button>

            {step === 'tournament' && (
              <Button
                onClick={() => setStep('config')}
                disabled={!tournamentId || bracketLoading || isBR || !hasBracket}
                className="bg-esi-red hover:bg-esi-red-dark text-white"
              >
                Lanjut
                <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            {step === 'config' && (
              <Button
                onClick={actions.generatePreview}
                disabled={!configIsValid}
                className="bg-esi-red hover:bg-esi-red-dark text-white"
              >
                Generate Preview
                <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            {step === 'preview' && (
              <Button
                onClick={actions.handleSave}
                disabled={saving || entries.length === 0}
                className="bg-esi-red hover:bg-esi-red-dark text-white"
              >
                {saving ? 'Menyimpan...' : `Simpan ${entries.length} Jadwal`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
