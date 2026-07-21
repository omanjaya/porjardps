'use client'

import Link from 'next/link'
import { Trophy, Plus, CalendarBlank, TreeStructure, WarningCircle } from '@phosphor-icons/react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import type { TeamDetail, Tournament } from '@/types'

interface TeamTournamentSectionProps {
  team: TeamDetail
  isCaptain: boolean
  registrableTournaments: Tournament[]
  registeringTournament: string | null
  onRegisterConfirm: (tournament: { tournamentId: string; tournamentName: string }) => void
}

export function TeamTournamentSection({
  team,
  isCaptain,
  registrableTournaments,
  registeringTournament,
  onRegisterConfirm,
}: TeamTournamentSectionProps) {
  return (
    <div className="mb-6 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900 dark:text-zinc-100">
        <Trophy size={20} weight="bold" />
        Turnamen
      </h2>

      {/* Enrolled tournaments */}
      {(team.tournaments ?? []).length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Terdaftar
          </h3>
          <div className="space-y-2">
            {(team.tournaments ?? []).map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 bg-esi-bg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy size={16} className="text-amber-500" />
                    <span className="text-sm font-medium text-stone-900 dark:text-zinc-100">{t.name}</span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/tournaments/${t.id}/schedule`}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:text-zinc-300 transition-colors hover:border-esi-red/40 hover:text-esi-red"
                  >
                    <CalendarBlank size={12} weight="bold" />
                    Lihat Jadwal
                  </Link>
                  <Link
                    href={`/tournaments/${t.id}/bracket`}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:text-zinc-300 transition-colors hover:border-esi-red/40 hover:text-esi-red"
                  >
                    <TreeStructure size={12} weight="bold" />
                    Lihat Bracket
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available tournaments */}
      {isCaptain && registrableTournaments.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Tersedia untuk Didaftarkan
          </h3>
          {team.status !== 'approved' && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <WarningCircle size={14} weight="bold" className="shrink-0" />
              Tim harus disetujui admin dulu
            </div>
          )}
          <p className="mb-2 text-xs text-stone-400 dark:text-zinc-500">
            Pendaftaran dilakukan per turnamen — pilih turnamen yang sesuai untuk tim ini.
          </p>
          <div className="space-y-2">
            {registrableTournaments.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-dashed border-stone-300 dark:border-zinc-600 bg-stone-50 dark:bg-zinc-800/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-stone-400 dark:text-zinc-500" />
                  <span className="text-sm text-stone-600 dark:text-zinc-400">{t.name}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onRegisterConfirm({ tournamentId: t.id, tournamentName: t.name })}
                  disabled={registeringTournament === t.id || team.status !== 'approved'}
                  title={team.status !== 'approved' ? 'Tim harus disetujui admin dulu' : undefined}
                  className="gap-1 bg-esi-red hover:bg-esi-red-dark text-white"
                >
                  <Plus size={12} />
                  {registeringTournament === t.id ? 'Mendaftar...' : 'Daftar'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(team.tournaments ?? []).length === 0 && registrableTournaments.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <Trophy size={36} weight="thin" className="mb-2 text-stone-300 dark:text-zinc-600" />
          <p className="text-sm text-stone-500 dark:text-zinc-400">Belum ada turnamen yang tersedia</p>
        </div>
      )}
    </div>
  )
}
