'use client'

import { Trophy, Plus } from '@phosphor-icons/react'
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
    <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
        <Trophy size={20} weight="bold" />
        Turnamen
      </h2>

      {/* Enrolled tournaments */}
      {(team.tournaments ?? []).length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Terdaftar
          </h3>
          <div className="space-y-2">
            {(team.tournaments ?? []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-porjar-bg p-3"
              >
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-sm font-medium text-stone-900">{t.name}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available tournaments */}
      {isCaptain && registrableTournaments.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Tersedia untuk Didaftarkan
          </h3>
          <div className="space-y-2">
            {registrableTournaments.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-stone-400" />
                  <span className="text-sm text-stone-600">{t.name}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => onRegisterConfirm({ tournamentId: t.id, tournamentName: t.name })}
                  disabled={registeringTournament === t.id}
                  className="gap-1 bg-porjar-red hover:bg-porjar-red-dark text-white"
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
          <Trophy size={36} weight="thin" className="mb-2 text-stone-300" />
          <p className="text-sm text-stone-500">Belum ada turnamen yang tersedia</p>
        </div>
      )}
    </div>
  )
}
