'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { MatchSubmissions } from '@/components/modules/bracket/MatchSubmissions'
import type { GroupMatch } from '@/types'

interface GroupMatchSheetContentProps {
  match: GroupMatch
  groupId: string
  onScoreSaved: () => void
  onVerified: () => void
}

export function GroupMatchSheetContent({ match, groupId, onScoreSaved, onVerified }: GroupMatchSheetContentProps) {
  const [scoreA, setScoreA] = useState(String(match.score_a))
  const [scoreB, setScoreB] = useState(String(match.score_b))
  const [saving, setSaving] = useState(false)
  const completed = match.status === 'completed'

  const handleSaveScore = async () => {
    setSaving(true)
    try {
      const sa = parseInt(scoreA) || 0
      const sb = parseInt(scoreB) || 0
      await api.put(`/admin/groups/${groupId}/matches/${match.id}`, { score_a: sa, score_b: sb })
      toast.success('Skor berhasil disimpan')
      onScoreSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan skor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
          Skor Pertandingan
        </h3>
        <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <p className="text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-2 break-words">
                {match.team_a?.name ?? 'TBD'}
              </p>
              <input
                type="number"
                min={0}
                value={scoreA}
                onFocus={e => e.target.select()}
                onChange={e => setScoreA(e.target.value)}
                className="w-16 h-12 text-center text-2xl font-black border border-stone-300 dark:border-zinc-600 rounded-lg focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100"
              />
            </div>
            <span className="text-xl font-bold text-stone-300 dark:text-zinc-600 mt-6">vs</span>
            <div className="flex-1 text-center">
              <p className="text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-2 break-words">
                {match.team_b?.name ?? 'TBD'}
              </p>
              <input
                type="number"
                min={0}
                value={scoreB}
                onFocus={e => e.target.select()}
                onChange={e => setScoreB(e.target.value)}
                className="w-16 h-12 text-center text-2xl font-black border border-stone-300 dark:border-zinc-600 rounded-lg focus:border-esi-red focus:outline-none focus:ring-2 focus:ring-esi-red/20 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100"
              />
            </div>
          </div>
          {completed && (
            <p className="text-[10px] text-center text-green-600 mt-2 font-medium">
              <CheckCircle size={10} weight="fill" className="inline mr-0.5" />
              Match sudah selesai ({match.score_a} - {match.score_b})
            </p>
          )}
          <Button
            onClick={handleSaveScore}
            disabled={saving}
            className="w-full mt-3 bg-esi-red hover:bg-esi-red/90 text-white text-sm"
          >
            {saving ? 'Menyimpan...' : completed ? 'Update Skor' : 'Simpan Skor'}
          </Button>
        </div>
      </div>

      <MatchSubmissions
        matchId={match.id}
        isAdmin
        onVerified={onVerified}
      />
    </>
  )
}
