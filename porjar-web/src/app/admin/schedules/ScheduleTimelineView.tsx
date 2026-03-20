'use client'

import { Button } from '@/components/ui/button'
import {
  CalendarBlank,
  PencilSimple,
  Trash,
  Clock,
  MapPin,
  Sword,
} from '@phosphor-icons/react'
import { GAME_CONFIG } from '@/constants/games'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from './ScheduleFormDialog'
import type { Schedule, GameSlug } from '@/types'

// ─── Game color mapping for timeline cards ───
function getGameAccent(slug?: GameSlug | null): { border: string; bg: string; dot: string } {
  if (!slug) return { border: 'border-stone-200', bg: 'bg-stone-50', dot: 'bg-stone-400' }
  const map: Record<GameSlug, { border: string; bg: string; dot: string }> = {
    hok: { border: 'border-amber-300', bg: 'bg-amber-50', dot: 'bg-amber-400' },
    ml: { border: 'border-blue-300', bg: 'bg-blue-50', dot: 'bg-blue-400' },
    ff: { border: 'border-orange-300', bg: 'bg-orange-50', dot: 'bg-orange-400' },
    pubgm: { border: 'border-yellow-300', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
    efootball: { border: 'border-green-300', bg: 'bg-green-50', dot: 'bg-green-400' },
  }
  return map[slug] ?? { border: 'border-stone-200', bg: 'bg-stone-50', dot: 'bg-stone-400' }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

interface DayGroup {
  dateKey: string
  dayNum: number
  label: string
  isToday: boolean
  schedules: Schedule[]
}

export interface MatchDetailData {
  team_a?: string; team_b?: string; status?: string
  score_a?: number; score_b?: number
  logo_a?: string; logo_b?: string
  school_a?: string; school_b?: string
}

interface ScheduleTimelineViewProps {
  groups: DayGroup[]
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  expandedSchedule: string | null
  matchDetails: Record<string, MatchDetailData>
  loadMatchDetail: (scheduleId: string, matchId: string) => void
  openEdit: (schedule: Schedule) => void
  setDeleteTarget: (schedule: Schedule) => void
  onShiftDay: (dayNum: number) => void
}

export function ScheduleTimelineView({
  groups,
  selectedIds,
  toggleSelect,
  expandedSchedule,
  matchDetails,
  loadMatchDetail,
  openEdit,
  setDeleteTarget,
  onShiftDay,
}: ScheduleTimelineViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.dateKey}>
          {/* Day header */}
          <div className="mb-3 flex items-center gap-3">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5',
                group.isToday ? 'bg-porjar-red text-white' : 'bg-stone-100 text-stone-700'
              )}
            >
              <CalendarBlank size={16} weight={group.isToday ? 'fill' : 'regular'} />
              <span className="text-sm font-bold">{group.label}</span>
              {group.isToday && (
                <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                  Hari Ini
                </span>
              )}
            </div>
            <span className="text-xs text-stone-400">{group.schedules.length} jadwal</span>
            <button
              onClick={() => onShiftDay(group.dayNum)}
              className="text-[10px] font-semibold text-porjar-red hover:underline"
            >
              Geser
            </button>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          {/* Timeline cards */}
          <div className="relative ml-4 space-y-3 border-l-2 border-stone-200 pl-6">
            {group.schedules.map((schedule) => {
              const gameSlug = schedule.game?.slug as GameSlug | undefined
              const gameConfig = gameSlug ? GAME_CONFIG[gameSlug] : null
              const gameAccent = getGameAccent(gameSlug ?? null)
              const statusCfg = STATUS_CONFIG[schedule.status] ?? STATUS_CONFIG.upcoming

              return (
                <div key={schedule.id} className="relative">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(schedule.id)}
                    onChange={() => toggleSelect(schedule.id)}
                    className="absolute -left-10 top-4 z-10 rounded border-stone-300"
                  />
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute -left-[31px] top-4 h-3 w-3 rounded-full border-2 border-white',
                      statusCfg.dot
                    )}
                  />

                  {/* Card */}
                  <div
                    className={cn(
                      'group rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md',
                      gameAccent.border,
                      schedule.status === 'ongoing' && 'ring-2 ring-red-200'
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Game icon */}
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                            gameAccent.bg,
                            gameAccent.border
                          )}
                        >
                          {gameConfig?.logo ? (
                            <img src={gameConfig.logo} alt={schedule.game?.name ?? ''} className="h-6 w-6 object-contain" />
                          ) : (
                            <CalendarBlank size={18} className="text-stone-400" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-stone-900 truncate">{schedule.title}</h4>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                statusCfg.bg,
                                statusCfg.text,
                                statusCfg.ring
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                              {statusCfg.label}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                            {/* Time */}
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(schedule.scheduled_at)}
                              {schedule.end_at && ` - ${formatTime(schedule.end_at)}`}
                            </span>

                            {/* Venue */}
                            {schedule.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {schedule.venue}
                              </span>
                            )}

                            {/* Tournament */}
                            {schedule.tournament && (
                              <span className="rounded bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                                {schedule.tournament.name}
                              </span>
                            )}

                            {/* Game name */}
                            {schedule.game && (
                              <span className={cn('font-medium', gameConfig?.color ?? 'text-stone-500')}>
                                {schedule.game.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => openEdit(schedule)}
                          className="text-stone-400 hover:text-stone-700"
                        >
                          <PencilSimple size={14} />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setDeleteTarget(schedule)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Match detail — click to expand */}
                    {schedule.bracket_match_id && (
                      <button
                        onClick={() => loadMatchDetail(schedule.id, schedule.bracket_match_id!)}
                        className="w-full text-left border-t border-stone-100 px-3 py-1.5 text-[11px] text-porjar-red hover:bg-stone-50 transition-colors flex items-center gap-1"
                      >
                        <Sword size={12} />
                        {expandedSchedule === schedule.id ? 'Sembunyikan detail' : 'Lihat pertandingan'}
                      </button>
                    )}

                    {expandedSchedule === schedule.id && schedule.bracket_match_id && (
                      <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-4">
                        {matchDetails[schedule.bracket_match_id] ? (() => {
                          const md = matchDetails[schedule.bracket_match_id]
                          const isCompleted = md.status === 'completed'
                          return (
                            <div className="flex items-center justify-center gap-6">
                              {/* Team A */}
                              <div className="flex-1 flex flex-col items-center text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden mb-2">
                                  {md.logo_a ? (
                                    <img src={md.logo_a} alt="" className="h-10 w-10 object-contain" />
                                  ) : (
                                    <span className="text-xl font-bold text-porjar-red">{(md.team_a ?? '?')[0]}</span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-stone-800 leading-tight">{md.team_a}</p>
                                {md.school_a && <p className="text-[10px] text-stone-400 mt-0.5">{md.school_a}</p>}
                              </div>

                              {/* Score / VS */}
                              <div className="text-center shrink-0">
                                {isCompleted ? (
                                  <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold tabular-nums ${(md.score_a ?? 0) > (md.score_b ?? 0) ? 'text-porjar-red' : 'text-stone-400'}`}>{md.score_a}</span>
                                    <span className="text-sm text-stone-300">:</span>
                                    <span className={`text-2xl font-bold tabular-nums ${(md.score_b ?? 0) > (md.score_a ?? 0) ? 'text-porjar-red' : 'text-stone-400'}`}>{md.score_b}</span>
                                  </div>
                                ) : (
                                  <span className="text-xl font-bold text-stone-300">VS</span>
                                )}
                                <p className="text-[10px] text-stone-400 mt-1">{md.status === 'completed' ? 'Selesai' : md.status === 'live' ? 'LIVE' : 'Belum dimulai'}</p>
                              </div>

                              {/* Team B */}
                              <div className="flex-1 flex flex-col items-center text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden mb-2">
                                  {md.logo_b ? (
                                    <img src={md.logo_b} alt="" className="h-10 w-10 object-contain" />
                                  ) : (
                                    <span className="text-xl font-bold text-stone-500">{(md.team_b ?? '?')[0]}</span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-stone-800 leading-tight">{md.team_b}</p>
                                {md.school_b && <p className="text-[10px] text-stone-400 mt-0.5">{md.school_b}</p>}
                              </div>
                            </div>
                          )
                        })() : (
                          <div className="flex justify-center py-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-porjar-red" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
