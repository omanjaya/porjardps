'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Tournament } from '@/types'

interface TournamentTabNavProps {
  tournamentId: string
}

function isBattleRoyale(format: string): boolean {
  return format === 'battle_royale_points'
}

function hasGroupStage(format: string): boolean {
  return format === 'group_stage_playoff'
}

function isSwiss(format: string): boolean {
  return format === 'swiss'
}

function isMultiStage(format: string): boolean {
  return format === 'multi_stage'
}

function hasBracket(format: string): boolean {
  return [
    'single_elimination',
    'double_elimination',
    'round_robin',
    'swiss',
    'group_stage_playoff',
  ].includes(format)
}

export function TournamentTabNav({ tournamentId }: TournamentTabNavProps) {
  const pathname = usePathname()
  const [tournament, setTournament] = useState<Tournament | null>(null)

  useEffect(() => {
    api
      .get<Tournament>(`/tournaments/${tournamentId}`)
      .then(setTournament)
      .catch(() => null)
  }, [tournamentId])

  const base = `/tournaments/${tournamentId}`

  const tabs = [
    { label: 'Info', href: base, exact: true, show: true },
    {
      label: 'Grup',
      href: `${base}/groups`,
      exact: false,
      show: tournament ? hasGroupStage(tournament.format) : false,
    },
    {
      label: 'Swiss',
      href: `${base}/swiss`,
      exact: false,
      show: tournament ? isSwiss(tournament.format) : false,
    },
    {
      label: 'Stages',
      href: `${base}/stages`,
      exact: false,
      show: tournament ? isMultiStage(tournament.format) : false,
    },
    {
      label: 'Bracket',
      href: `${base}/bracket`,
      exact: false,
      show: tournament ? hasBracket(tournament.format) : false,
    },
    {
      label: 'Standings',
      href: `${base}/standings`,
      exact: false,
      show: tournament ? isBattleRoyale(tournament.format) : false,
    },
    { label: 'Jadwal', href: `${base}/schedule`, exact: false, show: true },
    { label: 'Laporan', href: `${base}/report`, exact: false, show: true },
  ].filter((t) => t.show)

  function isActive(href: string, exact: boolean): boolean {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="mb-6 border-b border-stone-200">
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tournament tabs">
        {tabs.map((tab) => {
          const active = isActive(tab.href, tab.exact)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'inline-flex shrink-0 items-center px-4 py-2.5 text-sm font-medium transition-colors border-b-2',
                active
                  ? 'border-esi-red text-esi-red'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
