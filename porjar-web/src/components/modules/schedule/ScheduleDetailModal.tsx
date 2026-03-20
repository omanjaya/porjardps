'use client'

import { useEffect, useState } from 'react'
import { X, Clock, MapPin, Trophy, Users } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import type { Schedule, BracketMatch, TeamDetail, ScheduleTeam } from '@/types'

interface ScheduleDetailModalProps {
  schedule: Schedule | null
  onClose: () => void
}

interface MatchInfo {
  match: BracketMatch | null
  scheduleTeamA: ScheduleTeam | null
  scheduleTeamB: ScheduleTeam | null
  teamA: TeamDetail | null
  teamB: TeamDetail | null
}

export function ScheduleDetailModal({ schedule, onClose }: ScheduleDetailModalProps) {
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schedule) {
      setMatchInfo(null)
      return
    }

    // If we already have team info from the schedule (via backend JOIN), show immediately
    if (schedule.team_a || schedule.team_b) {
      setMatchInfo({
        match: null,
        scheduleTeamA: schedule.team_a,
        scheduleTeamB: schedule.team_b,
        teamA: null,
        teamB: null,
      })
    } else {
      setMatchInfo(null)
    }

    if (!schedule.bracket_match_id) return

    setLoading(true)
    api
      .get<BracketMatch>(`/matches/${schedule.bracket_match_id}`)
      .then(async (match) => {
        if (!match) return
        const teamAId = match.team_a?.id ?? schedule.team_a?.id
        const teamBId = match.team_b?.id ?? schedule.team_b?.id
        const [teamA, teamB] = await Promise.all([
          teamAId ? api.get<TeamDetail>(`/teams/${teamAId}`) : Promise.resolve(null),
          teamBId ? api.get<TeamDetail>(`/teams/${teamBId}`) : Promise.resolve(null),
        ])
        setMatchInfo({
          match,
          scheduleTeamA: schedule.team_a,
          scheduleTeamB: schedule.team_b,
          teamA: teamA ?? null,
          teamB: teamB ?? null,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [schedule?.bracket_match_id, schedule?.id])

  if (!schedule) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-stone-100">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-stone-900">{schedule.title}</p>
            {schedule.tournament && (
              <p className="mt-0.5 text-xs text-stone-400">{schedule.tournament.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Meta info */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <Clock size={13} />
            <span>
              {new Date(schedule.scheduled_at).toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {' · '}
              {new Date(schedule.scheduled_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {schedule.end_at &&
                ` – ${new Date(schedule.end_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </span>
          </div>
          {schedule.venue && (
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <MapPin size={12} />
              <span>{schedule.venue}</span>
            </div>
          )}
          <StatusBadge status={schedule.status} />
        </div>

        {/* Match content */}
        <div className="p-5">
          {matchInfo ? (
            <>
              <MatchDetail matchInfo={matchInfo} />
              {loading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-400" />
                  Memuat pemain...
                </div>
              )}
            </>
          ) : loading ? (
            <div className="flex flex-col items-center gap-2 py-8 text-stone-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-400" />
              <span className="text-xs">Memuat detail pertandingan...</span>
            </div>
          ) : schedule.description ? (
            <p className="text-sm text-stone-600 whitespace-pre-line">{schedule.description}</p>
          ) : (
            <p className="text-center text-sm text-stone-400 py-4">Belum ada detail tersedia.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MatchDetail({ matchInfo }: { matchInfo: MatchInfo }) {
  const { match, scheduleTeamA, scheduleTeamB, teamA, teamB } = matchInfo

  const nameA = teamA?.name ?? match?.team_a?.name ?? scheduleTeamA?.name ?? 'TBD'
  const schoolA = scheduleTeamA?.school_name
  const nameB = teamB?.name ?? match?.team_b?.name ?? scheduleTeamB?.name ?? 'TBD'
  const schoolB = scheduleTeamB?.school_name

  return (
    <div className="space-y-4">
      {/* VS header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="font-bold text-stone-900 truncate">{nameA}</p>
          {schoolA && <p className="text-xs text-stone-400 truncate">{schoolA}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {match?.score_a != null && match?.score_b != null ? (
            <span className="text-lg font-bold text-stone-700 tabular-nums">
              {match.score_a} – {match.score_b}
            </span>
          ) : (
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">VS</span>
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="font-bold text-stone-900 truncate">{nameB}</p>
          {schoolB && <p className="text-xs text-stone-400 truncate">{schoolB}</p>}
        </div>
      </div>

      {/* Players side by side */}
      {(teamA || teamB) && (
        <div className="grid grid-cols-2 gap-3">
          <TeamRoster team={teamA} />
          <TeamRoster team={teamB} isRight />
        </div>
      )}

      {match?.status === 'completed' && match.winner && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <Trophy size={14} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-700">Pemenang: {match.winner.name}</span>
        </div>
      )}
    </div>
  )
}

function TeamRoster({ team, isRight }: { team: TeamDetail | null; isRight?: boolean }) {
  if (!team) {
    return (
      <div className={`rounded-lg border border-dashed border-stone-200 p-3 text-center ${isRight ? 'text-right' : ''}`}>
        <p className="text-xs text-stone-400">TBD</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2 ${isRight ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1.5 ${isRight ? 'flex-row-reverse' : ''}`}>
        <Users size={12} className="text-stone-400 shrink-0" />
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide truncate">
          {team.member_count} pemain
        </p>
      </div>
      <ul className="space-y-1">
        {(team.members ?? []).map((m) => (
          <li key={m.id} className={`flex flex-col gap-0 ${isRight ? 'items-end' : 'items-start'}`}>
            <span className="text-xs font-medium text-stone-800 leading-tight">{m.full_name}</span>
            {m.in_game_name && (
              <span className="text-[10px] text-stone-400 leading-tight">
                {m.in_game_name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
