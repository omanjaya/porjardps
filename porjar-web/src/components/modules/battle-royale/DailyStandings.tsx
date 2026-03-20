'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, CheckCircle, XCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { BRDailyStanding, TeamSummary } from '@/types'

interface DailyStandingsProps {
  tournamentId: string
  dayNumber: number
  qualificationThreshold?: number | null
  teams?: TeamSummary[]
}

export function DailyStandings({
  tournamentId,
  dayNumber,
  qualificationThreshold,
  teams,
}: DailyStandingsProps) {
  const [standings, setStandings] = useState<BRDailyStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.get<BRDailyStanding[]>(
          `/tournaments/${tournamentId}/daily-standings/${dayNumber}`
        )
        setStandings(data ?? [])
      } catch (err) {
        console.error('Gagal memuat daily standings:', err)
        setStandings([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tournamentId, dayNumber])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-stone-200" />
        ))}
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="py-12 text-center text-stone-400">
        Belum ada data klasemen untuk hari {dayNumber}.
      </div>
    )
  }

  // Map team IDs to team names
  const teamMap = new Map<string, string>()
  if (teams) {
    for (const t of teams) {
      teamMap.set(t.id, t.name)
    }
  }

  // Find the qualification line position
  let qualificationLineAfter = -1
  if (qualificationThreshold != null && qualificationThreshold > 0) {
    for (let i = 0; i < standings.length; i++) {
      if (standings[i].total_points >= qualificationThreshold) {
        qualificationLineAfter = i
      }
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-stone-200 hover:bg-transparent">
            <TableHead className="w-16 text-stone-500">#</TableHead>
            <TableHead className="text-stone-500">Tim</TableHead>
            <TableHead className="text-right text-stone-500">Total Poin</TableHead>
            <TableHead className="text-right text-stone-500">Kills</TableHead>
            <TableHead className="text-center text-stone-500">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((s, idx) => {
            const rank = s.rank_position ?? idx + 1
            const teamName = s.team?.name ?? teamMap.get(s.team_id) ?? s.team_id.slice(0, 8)
            const isAboveThreshold =
              qualificationThreshold != null && s.total_points >= qualificationThreshold
            const showQualLine = idx === qualificationLineAfter

            return (
              <>
                <TableRow
                  key={s.id}
                  className={cn(
                    'border-stone-100 hover:bg-stone-50',
                    isAboveThreshold && 'bg-emerald-50/50',
                    !isAboveThreshold && qualificationThreshold != null && 'bg-red-50/30'
                  )}
                >
                  <TableCell className="font-bold text-stone-700">
                    <div className="flex items-center gap-1.5">
                      {rank <= 3 && (
                        <Trophy
                          size={14}
                          weight="fill"
                          className={cn(
                            rank === 1 && 'text-amber-500',
                            rank === 2 && 'text-stone-400',
                            rank === 3 && 'text-amber-700'
                          )}
                        />
                      )}
                      {rank}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-stone-900">{teamName}</span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-porjar-red tabular-nums">
                    {s.total_points}
                  </TableCell>
                  <TableCell className="text-right text-stone-700 tabular-nums">
                    {s.total_kills}
                  </TableCell>
                  <TableCell className="text-center">
                    {qualificationThreshold != null && (
                      isAboveThreshold ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          <CheckCircle size={12} weight="fill" />
                          Lolos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
                          <XCircle size={12} weight="fill" />
                          Tersingkir
                        </span>
                      )
                    )}
                  </TableCell>
                </TableRow>

                {/* Qualification line */}
                {showQualLine && (
                  <TableRow key={`qual-line-${idx}`} className="border-0">
                    <TableCell colSpan={5} className="p-0">
                      <div className="relative flex items-center py-1">
                        <div className="flex-1 border-t-2 border-dashed border-emerald-400/50" />
                        <span className="mx-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                          Batas Kualifikasi ({qualificationThreshold} pts)
                        </span>
                        <div className="flex-1 border-t-2 border-dashed border-emerald-400/50" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
