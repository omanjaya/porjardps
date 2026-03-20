'use client'

import Link from 'next/link'
import {
  Sword,
  Trophy,
  Users,
  Clock,
  Upload,
  CheckCircle,
  XCircle,
  ArrowRight,
  GameController,
  Student,
  Timer,
  Eye,
  Hourglass,
} from '@phosphor-icons/react'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { BracketMatch, TeamMember } from '@/types'

export interface MyTeamInfo {
  id: string
  name: string
  game_name: string
  game_slug: string
  school_name: string
  members: TeamMember[]
  logo_url: string | null
}

export interface SubmissionStatus {
  match_id: string
  status: 'pending' | 'approved' | 'rejected' | 'not_submitted'
  match_label: string
}

export function PlayerHeader({
  user,
  team,
}: {
  user: { full_name: string; tingkat?: string | null; needs_password_change?: boolean } | null
  team: MyTeamInfo | null
}) {
  return (
    <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-porjar-red/10">
            <GameController size={28} weight="duotone" className="text-porjar-red" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-porjar-text">{user?.full_name ?? 'Player'}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {user?.tingkat && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Student size={12} />
                  {user.tingkat}
                </span>
              )}
              {team && (
                <span className="inline-flex items-center gap-1 rounded-full border border-porjar-red/20 bg-porjar-red/5 px-2 py-0.5 text-xs font-medium text-porjar-red">
                  <Sword size={12} />
                  {team.game_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {team && (
          <div className="rounded-lg border border-porjar-border bg-porjar-bg p-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-porjar-muted" />
              <span className="text-sm font-semibold text-porjar-text">{team.name}</span>
            </div>
            <p className="mt-0.5 text-xs text-porjar-muted">{team.school_name}</p>
            {team.members.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {team.members.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-porjar-muted border border-porjar-border"
                  >
                    {m.full_name}
                    {m.role === 'captain' && ' (C)'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function CurrentMatchCard({
  match,
  team,
}: {
  match: BracketMatch | null
  team: MyTeamInfo
}) {
  if (!match) {
    return (
      <div className="rounded-xl border border-porjar-border bg-white p-6 shadow-sm text-center">
        <Timer size={32} className="mx-auto mb-2 text-stone-400" />
        <p className="text-sm font-medium text-stone-500">Belum ada pertandingan terjadwal</p>
        <p className="text-xs text-stone-400 mt-1">Jadwal pertandingan akan muncul di sini</p>
      </div>
    )
  }

  const isMyTeamA = match.team_a?.id === team.id
  const myTeam = isMyTeamA ? match.team_a : match.team_b
  const opponent = isMyTeamA ? match.team_b : match.team_a
  const myScore = isMyTeamA ? match.score_a : match.score_b
  const opponentScore = isMyTeamA ? match.score_b : match.score_a
  const didWin = match.winner?.id === team.id
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'

  return (
    <div className={`rounded-xl border-2 shadow-sm overflow-hidden ${
      isLive ? 'border-porjar-red bg-white' : 'border-porjar-border bg-white'
    }`}>
      {/* Top bar */}
      <div className={`flex items-center justify-between px-5 py-2.5 ${
        isLive ? 'bg-porjar-red' : 'bg-porjar-bg'
      }`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          isLive ? 'text-white' : 'text-porjar-muted'
        }`}>
          {isLive ? 'Sedang Berlangsung' : isCompleted ? 'Selesai' : 'Pertandingan Berikutnya'}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isLive ? 'text-white/80' : 'text-porjar-muted'}`}>
            Round {match.round} - Match #{match.match_number}
          </span>
          <StatusBadge status={match.status} />
        </div>
      </div>

      {/* Match content */}
      <div className="p-5">
        <div className="flex items-center justify-center gap-6">
          {/* Team A (my team) */}
          <div className="flex-1 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-porjar-red/10">
              <span className="text-xl font-bold text-porjar-red">
                {myTeam?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <p className="text-sm font-bold text-porjar-text truncate">{myTeam?.name ?? 'TBD'}</p>
            <p className="text-[10px] font-medium text-porjar-red uppercase">Tim Kamu</p>
          </div>

          {/* Score / VS */}
          <div className="text-center">
            {isCompleted || isLive ? (
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${didWin ? 'text-green-600' : 'text-porjar-text'}`}>
                  {myScore}
                </span>
                <span className="text-lg font-medium text-stone-400">:</span>
                <span className={`text-3xl font-bold ${!didWin && isCompleted ? 'text-green-600' : 'text-porjar-text'}`}>
                  {opponentScore}
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-stone-400">VS</span>
            )}
            {isCompleted && (
              <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                didWin ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {didWin ? (
                  <><CheckCircle size={12} weight="fill" /> Menang</>
                ) : (
                  <><XCircle size={12} weight="fill" /> Kalah</>
                )}
              </div>
            )}
          </div>

          {/* Team B (opponent) */}
          <div className="flex-1 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-stone-100">
              <span className="text-xl font-bold text-stone-500">
                {opponent?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <p className="text-sm font-bold text-porjar-text truncate">{opponent?.name ?? 'TBD'}</p>
            <p className="text-[10px] font-medium text-stone-500 uppercase">Lawan</p>
          </div>
        </div>

        {/* Countdown for upcoming */}
        {match.scheduled_at && match.status !== 'completed' && match.status !== 'live' && (
          <div className="mt-5 rounded-lg bg-porjar-bg p-4 text-center">
            <CountdownTimer
              targetDate={match.scheduled_at}
              label="Dimulai dalam"
              size="md"
            />
          </div>
        )}

        {/* Best of */}
        {match.best_of > 1 && (
          <p className="mt-3 text-center text-xs text-stone-500">
            Best of {match.best_of}
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {isLive && (
            <Link
              href="/dashboard/submit-result"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-porjar-red px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110"
            >
              <Upload size={18} weight="bold" />
              KIRIM BUKTI HASIL
            </Link>
          )}
          {match.status === 'completed' && (
            <Link
              href={`/matches/${match.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-porjar-border bg-white px-4 py-2 text-sm font-medium text-porjar-muted transition-all hover:border-porjar-red/30 hover:text-porjar-red"
            >
              <Eye size={16} />
              Lihat Detail
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function BracketPosition({ path }: { path: string[] }) {
  return (
    <div className="rounded-xl border border-porjar-border bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-porjar-text">
        <Trophy size={18} weight="bold" className="text-porjar-red" />
        Posisi di Bracket
      </h2>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {path.map((step, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            {i > 0 && (
              <ArrowRight size={14} className="text-stone-400" />
            )}
            <span
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                i === path.length - 1
                  ? 'bg-porjar-red/10 text-porjar-red border border-porjar-red/20'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MatchHistory({
  matches,
  myTeamId,
}: {
  matches: BracketMatch[]
  myTeamId: string
}) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-porjar-text">
        <Trophy size={20} weight="bold" />
        Riwayat Pertandingan
      </h2>
      <div className="space-y-2">
        {matches.map((match) => (
          <MatchHistoryCard key={match.id} match={match} myTeamId={myTeamId} />
        ))}
      </div>
    </div>
  )
}

export function MatchHistoryCard({
  match,
  myTeamId,
}: {
  match: BracketMatch
  myTeamId: string
}) {
  const isMyTeamA = match.team_a?.id === myTeamId
  const opponent = isMyTeamA ? match.team_b : match.team_a
  const myScore = isMyTeamA ? match.score_a : match.score_b
  const opponentScore = isMyTeamA ? match.score_b : match.score_a
  const didWin = match.winner?.id === myTeamId
  const isCompleted = match.status === 'completed'

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        isCompleted
          ? didWin
            ? 'border-green-200 hover:border-green-300'
            : 'border-red-200 hover:border-red-300'
          : 'border-porjar-border hover:border-porjar-red/30'
      }`}
    >
      {/* Result indicator */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          isCompleted
            ? didWin
              ? 'bg-green-50'
              : 'bg-red-50'
            : 'bg-blue-50'
        }`}
      >
        {isCompleted ? (
          didWin ? (
            <CheckCircle size={22} weight="fill" className="text-green-600" />
          ) : (
            <XCircle size={22} weight="fill" className="text-red-600" />
          )
        ) : (
          <Clock size={22} className="text-blue-600" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-porjar-text truncate">
            vs {opponent?.name ?? 'TBD'}
          </p>
          <StatusBadge status={match.status} />
        </div>
        <p className="text-xs text-porjar-muted">
          Round {match.round} - Match #{match.match_number}
          {match.scheduled_at && (
            <> &middot; {new Date(match.scheduled_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</>
          )}
        </p>
      </div>

      {/* Score */}
      {isCompleted && (
        <div className="text-right">
          <span className={`text-lg font-bold ${didWin ? 'text-green-600' : 'text-red-600'}`}>
            {myScore} - {opponentScore}
          </span>
        </div>
      )}

      <ArrowRight size={16} className="shrink-0 text-stone-400" />
    </Link>
  )
}

export function SubmissionStatusSection({
  submissions,
}: {
  submissions: SubmissionStatus[]
}) {
  const statusIcons: Record<string, React.ReactNode> = {
    approved: <CheckCircle size={16} weight="fill" className="text-green-600" />,
    rejected: <XCircle size={16} weight="fill" className="text-red-600" />,
    pending: <Hourglass size={16} weight="fill" className="text-amber-600" />,
    not_submitted: <Upload size={16} className="text-stone-400" />,
  }

  const statusLabels: Record<string, string> = {
    approved: 'Diterima',
    rejected: 'Ditolak',
    pending: 'Menunggu Verifikasi',
    not_submitted: 'Belum Upload',
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-porjar-text">
        <Upload size={20} weight="bold" />
        Status Pengiriman Bukti
      </h2>
      <div className="rounded-xl border border-porjar-border bg-white shadow-sm divide-y divide-porjar-border">
        {submissions.map((sub) => (
          <div key={sub.match_id} className="flex items-center gap-3 px-5 py-3">
            {statusIcons[sub.status]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-porjar-text">{sub.match_label}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                sub.status === 'approved'
                  ? 'bg-green-50 text-green-700'
                  : sub.status === 'rejected'
                  ? 'bg-red-50 text-red-700'
                  : sub.status === 'pending'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {statusLabels[sub.status]}
            </span>
            {sub.status === 'not_submitted' && (
              <Link
                href="/dashboard/submit-result"
                className="text-xs font-semibold text-porjar-red hover:underline"
              >
                Upload
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
