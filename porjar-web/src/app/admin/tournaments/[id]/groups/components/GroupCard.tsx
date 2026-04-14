'use client'

import {
  Trash, ListPlus, Play,
  CaretDown, CaretUp,
  Minus, ArrowCounterClockwise, PencilSimple,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GroupMatchCard } from './GroupMatchCard'
import type { TournamentGroup, GroupMatch, GroupStanding } from '@/types'

interface GroupCardProps {
  group: TournamentGroup
  matches: GroupMatch[]
  standings: GroupStanding[]
  expanded: boolean
  operating: boolean
  onToggle: (id: string) => void
  onAddTeams: (groupId: string) => void
  onGenerate: (groupId: string) => void
  onSetAllLive: (groupId: string, round?: number) => void
  onResetGroupResults: (groupId: string) => void
  onEdit: (group: TournamentGroup) => void
  onDelete: (groupId: string) => void
  onRemoveTeam: (groupId: string, teamId: string) => void
  onPenalty: (groupId: string, teamId: string, penaltyPoints: number) => void
  onUpdateScore: (matchId: string, groupId: string, sa: number, sb: number, scheduledAt?: string) => void
  onSetMatchLive: (matchId: string, groupId: string) => void
  onResetMatchSubmissions: (matchId: string) => void
  onViewSubmissions: (match: GroupMatch) => void
  onConfirm: (message: string, action: () => void) => void
}

export function GroupCard(props: GroupCardProps) {
  const {
    group, matches, standings, expanded, operating,
    onToggle, onAddTeams, onGenerate, onSetAllLive, onResetGroupResults,
    onEdit, onDelete, onRemoveTeam, onPenalty, onUpdateScore, onSetMatchLive,
    onResetMatchSubmissions, onViewSubmissions, onConfirm,
  } = props

  const done = matches.filter(m => m.status === 'completed').length
  const total = matches.length
  const progress = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <button
        onClick={() => onToggle(group.id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-esi-red/10 text-sm font-black text-esi-red">
            {group.name.replace('Grup ', '')}
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100">{group.name}</h3>
            <p className="text-xs text-stone-400 dark:text-zinc-500">
              {(group.teams ?? []).length} tim &middot; {done}/{total} match &middot; Top {group.advance_count} lolos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 w-32">
            <div className="flex-1 h-1.5 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-esi-red')} style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500 w-8 text-right">{Math.round(progress)}%</span>
          </div>
          {expanded ? <CaretUp size={16} className="text-stone-400 dark:text-zinc-500" /> : <CaretDown size={16} className="text-stone-400 dark:text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-stone-100 dark:border-zinc-700">
          <div className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border-b border-stone-100 dark:border-zinc-700">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAddTeams(group.id)}>
              <ListPlus size={12} className="mr-1" /> Tambah Tim
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={operating} onClick={() => onGenerate(group.id)}>
              <Play size={12} className="mr-1" /> Generate
            </Button>
            {matches.length > 0 && matches.some(m => m.status !== 'live' && m.status !== 'completed') && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                disabled={operating}
                onClick={() => onConfirm(`Set semua match di ${group.name} ke LIVE?`, () => onSetAllLive(group.id))}
              >
                <Play size={12} className="mr-1" /> Set All LIVE
              </Button>
            )}
            {matches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                disabled={operating}
                onClick={() => onConfirm(`Reset semua hasil & submissions di ${group.name}? Standings akan dikosongkan.`, () => onResetGroupResults(group.id))}
              >
                <ArrowCounterClockwise size={12} className="mr-1" /> Reset Hasil
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEdit(group)}>
              <PencilSimple size={12} />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 hover:bg-red-50 dark:bg-red-950/30" disabled={operating} onClick={() => onDelete(group.id)}>
              <Trash size={12} />
            </Button>
          </div>

          <div className="p-5 space-y-5">
            {(group.teams ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(group.teams ?? []).map((team) => (
                  <span
                    key={team.id}
                    onClick={() => onRemoveTeam(group.id, team.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-zinc-400 cursor-pointer hover:bg-red-50 dark:bg-red-950/30 hover:text-red-600 transition-colors"
                  >
                    {team.name} <span className="text-stone-400 dark:text-zinc-500 hover:text-red-400">&times;</span>
                  </span>
                ))}
              </div>
            )}

            {standings.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-zinc-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-zinc-800/50 text-stone-500 dark:text-zinc-400">
                      <th className="w-8 py-2 text-center font-semibold">#</th>
                      <th className="py-2 pl-3 text-left font-semibold">Tim</th>
                      <th className="w-8 py-2 text-center font-semibold">M</th>
                      <th className="w-8 py-2 text-center font-semibold">W</th>
                      <th className="w-8 py-2 text-center font-semibold">D</th>
                      <th className="w-8 py-2 text-center font-semibold">L</th>
                      <th className="w-8 py-2 text-center font-semibold">SM</th>
                      <th className="w-8 py-2 text-center font-semibold">SK</th>
                      <th className="w-10 py-2 text-center font-semibold">SS</th>
                      <th className="w-10 py-2 text-center font-semibold">Pen</th>
                      <th className="w-10 py-2 text-center font-bold text-stone-700 dark:text-zinc-300">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => {
                      const advancing = s.rank_position <= group.advance_count
                      return (
                        <tr key={s.team_id} className={cn('border-t border-stone-100 dark:border-zinc-700', advancing && 'bg-green-50 dark:bg-green-950/30')}>
                          <td className="py-2 text-center">
                            <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                              advancing ? 'bg-green-500 text-white' : 'bg-stone-200 text-stone-500 dark:text-zinc-400'
                            )}>{s.rank_position}</span>
                          </td>
                          <td className="py-2 pl-3 font-medium text-stone-800 dark:text-zinc-200">{s.team?.name ?? '-'}</td>
                          <td className="py-2 text-center text-stone-500 dark:text-zinc-400">{s.matches_played}</td>
                          <td className="py-2 text-center font-medium text-green-600">{s.wins}</td>
                          <td className="py-2 text-center text-stone-400 dark:text-zinc-500">{s.draws}</td>
                          <td className="py-2 text-center text-red-500">{s.losses}</td>
                          <td className="py-2 text-center text-stone-500 dark:text-zinc-400">{s.goals_for}</td>
                          <td className="py-2 text-center text-stone-500 dark:text-zinc-400">{s.goals_against}</td>
                          <td className={cn('py-2 text-center font-medium', s.goal_difference > 0 ? 'text-green-600' : s.goal_difference < 0 ? 'text-red-500' : 'text-stone-400 dark:text-zinc-500')}>
                            {s.goal_difference > 0 ? '+' : ''}{s.goal_difference}
                          </td>
                          <td className="py-2 text-center">
                            {s.penalty_points > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <span className="text-red-500 font-medium">-{s.penalty_points}</span>
                                <button onClick={() => onPenalty(group.id, s.team_id, s.penalty_points + 1)} title="Tambah penalti" className="ml-0.5 text-stone-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors">
                                  <Minus size={10} />
                                </button>
                                <button onClick={() => onPenalty(group.id, s.team_id, 0)} title="Reset penalti" className="ml-0.5 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                                  <ArrowCounterClockwise size={10} />
                                </button>
                              </span>
                            ) : (
                              <button onClick={() => onPenalty(group.id, s.team_id, 1)} title="Tambah penalti" className="text-stone-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors">
                                <Minus size={12} />
                              </button>
                            )}
                          </td>
                          <td className="py-2 text-center font-black text-stone-900 dark:text-zinc-100">{s.points}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {matches.length > 0 && (() => {
              const roundNums = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
              return (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">Pertandingan</p>
                  {roundNums.map(round => {
                    const roundMatches = matches.filter(m => m.round === round)
                    const hasNonLive = roundMatches.some(m => m.status !== 'live' && m.status !== 'completed')
                    return (
                      <div key={round}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-stone-500 dark:text-zinc-400">Round {round}</span>
                          {hasNonLive && (
                            <button
                              onClick={() => onSetAllLive(group.id, round)}
                              disabled={operating}
                              className="text-[9px] font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-red-50 dark:bg-red-950/30 rounded px-1.5 py-0.5"
                            >
                              Set Round LIVE
                            </button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {roundMatches.map((m) => (
                            <GroupMatchCard key={m.id} match={m} groupId={group.id} onSave={onUpdateScore} onSetLive={onSetMatchLive} onResetSubmissions={onResetMatchSubmissions} onViewSubmissions={onViewSubmissions} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
