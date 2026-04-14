'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  Upload,
  CheckCircle,
  XCircle,
  Timer,
  Eye,
  Printer,
  CaretDown,
  Info,
  MonitorPlay,
  Lightning,
} from '@phosphor-icons/react'
import { useAuthStore } from '@/store/auth-store'
import { sanitizeUrl } from '@/lib/utils'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { BracketMatch } from '@/types'
import type { MyTeamInfo } from './PlayerHeader'

export function CurrentMatchCard({
  match,
  team,
}: {
  match: BracketMatch | null
  team: MyTeamInfo
}) {
  if (!match) {
    return (
      <div className="rounded-xl border border-esi-border bg-white dark:bg-zinc-900 p-6 shadow-sm text-center">
        <Timer size={32} className="mx-auto mb-2 text-stone-400 dark:text-zinc-500" />
        <p className="text-sm font-medium text-stone-500 dark:text-zinc-400">Belum ada pertandingan terjadwal</p>
        <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Jadwal pertandingan akan muncul di sini</p>
      </div>
    )
  }

  const user = useAuthStore.getState().user
  const isCaptain = !!user && team.members.some((m) => m.user_id === user.id && m.role === 'captain')
  const canCheckIn =
    isCaptain && (match.status === 'scheduled' || match.status === 'pending' || match.status === 'live')

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
      isLive ? 'border-esi-red bg-white dark:bg-zinc-900 ring-2 ring-esi-red/30 animate-[pulse_2s_ease-in-out_infinite]' : 'border-esi-border bg-white dark:bg-zinc-900'
    }`}>
      {/* Top bar */}
      <div className={`flex flex-wrap items-center justify-between gap-1 px-4 py-2.5 ${
        isLive ? 'bg-esi-red' : 'bg-esi-bg'
      }`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          isLive ? 'text-white' : 'text-esi-muted'
        }`}>
          {isLive ? 'Sedang Berlangsung' : isCompleted ? 'Selesai' : 'Match Berikutnya'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] ${isLive ? 'text-white/80' : 'text-esi-muted'}`}>
            R{match.round} M{match.match_number}
          </span>
          <StatusBadge status={match.status} />
        </div>
      </div>

      {/* Match content */}
      <div className="p-3 sm:p-5">
        <div className="flex items-center justify-center gap-2 sm:gap-6">
          {/* Team A (my team) */}
          <div className="min-w-0 flex-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-esi-red/10">
              <span className="text-xl font-bold text-esi-red">
                {myTeam?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-esi-text line-clamp-2 leading-tight">{myTeam?.name ?? 'TBD'}</p>
            <p className="text-[10px] font-medium text-esi-red uppercase mt-0.5">Tim Kamu</p>
          </div>

          {/* Score / VS */}
          <div className="shrink-0 text-center px-1">
            {isCompleted || isLive ? (
              <div className="flex items-center gap-2">
                <span className={`text-2xl sm:text-3xl font-bold ${didWin ? 'text-green-600' : 'text-esi-text'}`}>
                  {myScore}
                </span>
                <span className="text-base font-medium text-stone-400 dark:text-zinc-500">:</span>
                <span className={`text-2xl sm:text-3xl font-bold ${!didWin && isCompleted ? 'text-green-600' : 'text-esi-text'}`}>
                  {opponentScore}
                </span>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-stone-400 dark:text-zinc-500">VS</span>
            )}
            {isCompleted && (
              <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                didWin ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
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
          <div className="min-w-0 flex-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800">
              <span className="text-xl font-bold text-stone-500 dark:text-zinc-400">
                {opponent?.name?.charAt(0) ?? '?'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-esi-text line-clamp-2 leading-tight">{opponent?.name ?? 'TBD'}</p>
            <p className="text-[10px] font-medium text-stone-500 dark:text-zinc-400 uppercase mt-0.5">Lawan</p>
          </div>
        </div>

        {/* Info Lawan */}
        {opponent && <OpponentInfoSection opponent={opponent} />}

        {/* Countdown for upcoming */}
        {match.scheduled_at && match.status !== 'completed' && match.status !== 'live' && (
          <div className="mt-5 rounded-lg bg-esi-bg p-4 text-center">
            <CountdownTimer
              targetDate={match.scheduled_at}
              label="Dimulai dalam"
              size="md"
            />
          </div>
        )}

        {/* Best of */}
        {match.best_of > 1 && (
          <p className="mt-3 text-center text-xs text-stone-500 dark:text-zinc-400">
            Best of {match.best_of}
          </p>
        )}

        {/* Captain check-in CTA */}
        {canCheckIn && (
          <div className="mt-5">
            <Link
              href={`/dashboard/my-matches/check-in/${match.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-esi-red px-6 py-4 text-sm font-bold text-white shadow-sm ring-2 ring-esi-red/30 transition-all hover:brightness-110 active:scale-[0.99] min-h-[56px]"
            >
              <Lightning size={22} weight="fill" />
              CHECK-IN SEKARANG
            </Link>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {isLive && (
            <Link
              href="/dashboard/submit-result"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-esi-red px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110"
            >
              <Upload size={18} weight="bold" />
              KIRIM BUKTI HASIL
            </Link>
          )}
          <Link
            href={`/matches/${match.id}/card`}
            target="_blank"
            rel="noopener noreferrer"
            title="Cetak Kartu Pertandingan"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-esi-border bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-esi-muted transition-all hover:border-esi-red/30 hover:text-esi-red"
          >
            <Printer size={16} />
            Cetak
          </Link>
          {match.status === 'completed' && (
            <Link
              href={`/matches/${match.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-esi-border bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-esi-muted transition-all hover:border-esi-red/30 hover:text-esi-red"
            >
              <Eye size={16} />
              Lihat Detail
            </Link>
          )}
        </div>

        {/* Stream link */}
        {match.stream_url && (isLive || isCompleted) && (() => {
          const safeUrl = sanitizeUrl(match.stream_url)
          return safeUrl ? (
            <div className="mt-3 text-center">
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-esi-border bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-esi-muted transition-all hover:border-esi-red/30 hover:text-esi-red"
              >
                <MonitorPlay size={16} />
                Tonton Live
              </a>
            </div>
          ) : null
        })()}

        {/* TODO: BR room ID/password requires API changes to include lobby data in player matches */}
      </div>
    </div>
  )
}

function OpponentInfoSection({ opponent }: { opponent: { name: string; school_name?: string | null } }) {
  const [isOpen, setIsOpen] = useState(false)

  const hasInfo = opponent.name || opponent.school_name

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mx-auto flex items-center gap-1.5 rounded-lg border border-esi-border bg-esi-bg px-3 py-1.5 text-xs font-semibold text-esi-muted transition-colors hover:border-esi-red/30 hover:text-esi-red"
      >
        <Info size={14} />
        Info Lawan
        <CaretDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {hasInfo ? (
          <div className="rounded-lg border border-esi-border bg-esi-bg p-3 text-center">
            <p className="text-sm font-bold text-esi-text">{opponent.name}</p>
            {opponent.school_name && (
              <p className="mt-0.5 text-xs text-esi-muted">{opponent.school_name}</p>
            )}
          </div>
        ) : (
          <p className="text-center text-xs text-stone-400 dark:text-zinc-500 italic">Info tidak tersedia</p>
        )}
      </div>
    </div>
  )
}
