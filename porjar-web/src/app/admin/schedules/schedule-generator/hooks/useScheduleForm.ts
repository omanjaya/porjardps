'use client'

import { useState, useEffect } from 'react'
import type { BracketMatch } from '@/types'
import type { RoundConfig, PreviewEntry, Step } from '../lib/scheduleGenerator'

export function useScheduleForm(open: boolean) {
  const [step, setStep] = useState<Step>('tournament')
  const [tournamentId, setTournamentId] = useState('')
  const [bracketLoading, setBracketLoading] = useState(false)
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([])
  const [hasBracket, setHasBracket] = useState(false)
  const [isBR, setIsBR] = useState(false)

  // Config state
  const [titlePrefix, setTitlePrefix] = useState('')
  const [venue, setVenue] = useState('')
  const [durationMinStr, setDurationMinStr] = useState('45')
  const [breakMinStr, setBreakMinStr] = useState('15')
  const durationMin = parseInt(durationMinStr) || 0
  const breakMin = parseInt(breakMinStr) || 0
  const [roundConfigs, setRoundConfigs] = useState<RoundConfig[]>([])

  // Preview state
  const [entries, setEntries] = useState<PreviewEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('tournament')
        setTournamentId('')
        setBracketMatches([])
        setHasBracket(false)
        setIsBR(false)
        setTitlePrefix('')
        setVenue('')
        setDurationMinStr('45')
        setBreakMinStr('15')
        setRoundConfigs([])
        setEntries([])
        setSaveProgress(0)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const configIsValid =
    roundConfigs.length > 0 && roundConfigs.every((rc) => rc.date && rc.startTime)

  return {
    step, setStep,
    tournamentId, setTournamentId,
    bracketLoading, setBracketLoading,
    bracketMatches, setBracketMatches,
    hasBracket, setHasBracket,
    isBR, setIsBR,
    titlePrefix, setTitlePrefix,
    venue, setVenue,
    durationMinStr, setDurationMinStr,
    breakMinStr, setBreakMinStr,
    durationMin, breakMin,
    roundConfigs, setRoundConfigs,
    entries, setEntries,
    saving, setSaving,
    saveProgress, setSaveProgress,
    configIsValid,
  }
}

export type ScheduleFormState = ReturnType<typeof useScheduleForm>
