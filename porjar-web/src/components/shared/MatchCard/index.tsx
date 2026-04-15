'use client'

import { Calendar, MapPin, Clock, GameController, User, Trophy } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Printer } from '@phosphor-icons/react'
import type { BracketMatch } from '@/types'
import type { Tournament } from '@/types/tournament'
import type { Event } from '@/types/common'
import { formatDateFull, formatTime } from '@/lib/relativeTime'

interface MatchCardProps {
  match: BracketMatch
  tournament?: Tournament | null
  event?: Event | null
  refereeName?: string | null
  showPrintButton?: boolean
}



function checkInTime(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  try {
    const d = new Date(iso)
    d.setMinutes(d.getMinutes() - 15)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

function roundLabel(match: BracketMatch): string {
  return `Round ${match.round} · Match #${match.match_number}`
}

export function MatchCard({ match, tournament, event, refereeName, showPrintButton = true }: MatchCardProps) {
  const teamA = match.team_a
  const teamB = match.team_b
  const eventName = event?.name ?? 'ESI Denpasar'
  const eventLogo = event?.logo_url ?? null
  const venue = event?.venue ?? 'TBD'
  const matchUrl = typeof window !== 'undefined' ? `${window.location.origin}/matches/${match.id}` : `/matches/${match.id}`

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #000 !important;
            page-break-after: always;
          }
          @page { size: A5 landscape; margin: 10mm; }
        }
      `}</style>

      <div className="print-card mx-auto w-full max-w-4xl rounded-2xl border border-stone-300 bg-white p-8 shadow-lg text-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-esi-red pb-4">
          <div className="flex items-center gap-3">
            {eventLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={eventLogo} alt={eventName} className="h-12 w-12 object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-esi-red text-white font-black">
                {eventName.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">{eventName}</div>
              <div className="text-2xl font-black text-esi-red leading-none">MATCH CARD</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-stone-500">Match ID</div>
            <div className="font-mono text-lg font-bold text-stone-900">#{match.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        {/* Round & Tournament */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div>
            <div className="font-bold text-stone-900">{roundLabel(match)}</div>
            <div className="text-stone-600">
              {tournament?.name ?? match.tournament?.name ?? 'Tournament'}
              {tournament?.game?.name && <span className="text-stone-600 dark:text-zinc-400"> · {tournament.game.name}</span>}
            </div>
          </div>
          {match.bracket_position && (
            <div className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
              {match.bracket_position}
            </div>
          )}
        </div>

        {/* Teams VS */}
        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Team A */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-stone-200 bg-stone-50">
              {teamA?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamA.logo_url} alt={teamA.name} className="h-16 w-16 object-contain" />
              ) : (
                <Trophy size={32} className="text-stone-400" />
              )}
            </div>
            <div className="mt-2 text-base font-bold text-stone-900 line-clamp-2">{teamA?.name ?? 'TBD'}</div>
            {teamA?.school_name && <div className="text-xs text-stone-500">{teamA.school_name}</div>}
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-black text-esi-red">VS</div>
            <div className="mt-1 rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
              BO{match.best_of}
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-stone-200 bg-stone-50">
              {teamB?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamB.logo_url} alt={teamB.name} className="h-16 w-16 object-contain" />
              ) : (
                <Trophy size={32} className="text-stone-400" />
              )}
            </div>
            <div className="mt-2 text-base font-bold text-stone-900 line-clamp-2">{teamB?.name ?? 'TBD'}</div>
            {teamB?.school_name && <div className="text-xs text-stone-500">{teamB.school_name}</div>}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 text-esi-red shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500">Tanggal</div>
              <div className="font-semibold">{match.scheduled_at ? formatDateFull(match.scheduled_at) : 'TBD'}</div>
              <div className="text-stone-600">Pukul {match.scheduled_at ? formatTime(match.scheduled_at) : '--:--'} WITA</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 text-esi-red shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500">Venue</div>
              <div className="font-semibold">{venue}</div>
              {event?.city && <div className="text-stone-600">{event.city}</div>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={16} className="mt-0.5 text-esi-red shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500">Check-in</div>
              <div className="font-semibold">{checkInTime(match.scheduled_at)} WITA</div>
              <div className="text-stone-600">15 menit sebelum match</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <GameController size={16} className="mt-0.5 text-esi-red shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500">Format</div>
              <div className="font-semibold">Best of {match.best_of}</div>
              <div className="text-stone-600">{tournament?.format ?? 'Tournament'}</div>
            </div>
          </div>
          {refereeName && (
            <div className="col-span-2 flex items-start gap-2">
              <User size={16} className="mt-0.5 text-esi-red shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wider text-stone-500">Referee</div>
                <div className="font-semibold">{refereeName}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-end justify-between border-t border-stone-200 pt-3">
          <div className="text-xs text-stone-500">
            <div className="font-bold text-stone-700">{eventName}</div>
            <div>{event?.organizer ?? 'ESI Denpasar'}</div>
            <div className="mt-1 max-w-[260px] break-all">{matchUrl}</div>
          </div>
          <div className="flex h-20 w-20 items-center justify-center border border-dashed border-stone-300 bg-white text-[8px] text-stone-400">
            QR CODE
          </div>
        </div>
      </div>

      {showPrintButton && (
        <div className="no-print mt-6 flex justify-center">
          <Button
            onClick={() => window.print()}
            className="bg-esi-red hover:bg-esi-red-dark text-white"
          >
            <Printer size={16} className="mr-2" />
            Cetak Kartu
          </Button>
        </div>
      )}
    </>
  )
}
