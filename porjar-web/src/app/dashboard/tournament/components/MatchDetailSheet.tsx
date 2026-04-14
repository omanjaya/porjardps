'use client'

import { MatchDetailSheet as BaseMatchDetailSheet } from '@/components/modules/bracket/MatchDetailSheet'
import type { BracketMatch } from '@/types'

interface Props {
  match: BracketMatch | null
  open: boolean
  onClose: () => void
}

export function PlayerMatchDetailSheet({ match, open, onClose }: Props) {
  return (
    <BaseMatchDetailSheet match={match} open={open} onClose={onClose} isAdmin={false} />
  )
}
