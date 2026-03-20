import { cn } from '@/lib/utils'
import {
  CheckCircle,
  MapPin,
  Timer,
  Star,
  Prohibit,
} from '@phosphor-icons/react'
import type { BracketMatch, MatchGame } from '@/types'

interface GameDetailsListProps {
  match: BracketMatch
}

export function GameDetailsList({ match }: GameDetailsListProps) {
  const hasGames = match.games && match.games.length > 0
  const hasHeroBans = match.games?.some((g) => g.hero_bans)

  if (!hasGames && !hasHeroBans) return null

  return (
    <>
      {/* Game Details */}
      {hasGames && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-1">
            Detail Game
          </h3>
          <div className="space-y-2">
            {match.games!.map((game) => (
              <GameDetailCard
                key={game.game_number}
                game={game}
                teamAName={match.team_a?.name ?? 'TBD'}
                teamBName={match.team_b?.name ?? 'TBD'}
                teamAId={match.team_a?.id}
                teamBId={match.team_b?.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hero Bans (MOBA) */}
      {hasHeroBans && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-1">
            Hero Bans
          </h3>
          {match.games!
            .filter((g) => g.hero_bans)
            .map((game) => (
              <HeroBanCard
                key={`bans-${game.game_number}`}
                game={game}
                teamAName={match.team_a?.name ?? 'Team A'}
                teamBName={match.team_b?.name ?? 'Team B'}
              />
            ))}
        </div>
      )}
    </>
  )
}

function GameDetailCard({
  game,
  teamAName,
  teamBName,
  teamAId,
  teamBId,
}: {
  game: MatchGame
  teamAName: string
  teamBName: string
  teamAId?: string
  teamBId?: string
}) {
  const winnerIsA = game.winner_id === teamAId
  const winnerIsB = game.winner_id === teamBId
  const hasWinner = game.winner_id != null

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          Game {game.game_number}
        </span>
        <div className="flex items-center gap-2">
          {game.map_name && (
            <span className="flex items-center gap-1 text-[10px] text-stone-500">
              <MapPin size={8} />
              {game.map_name}
            </span>
          )}
          {game.duration_minutes && (
            <span className="flex items-center gap-1 text-[10px] text-stone-500">
              <Timer size={8} />
              {game.duration_minutes}m
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            winnerIsA ? 'text-green-600' : 'text-stone-500'
          )}
        >
          {teamAName}
        </span>
        <span className="flex items-center gap-2 text-sm font-bold tabular-nums">
          <span className={winnerIsA ? 'text-green-600' : 'text-stone-500'}>
            {game.score_a}
          </span>
          <span className="text-stone-300">-</span>
          <span className={winnerIsB ? 'text-green-600' : 'text-stone-500'}>
            {game.score_b}
          </span>
        </span>
        <span
          className={cn(
            'text-sm font-medium',
            winnerIsB ? 'text-green-600' : 'text-stone-500'
          )}
        >
          {teamBName}
        </span>
      </div>
      {hasWinner && (
        <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-green-500">
          <CheckCircle size={10} weight="fill" />
          <span>{winnerIsA ? teamAName : teamBName}</span>
        </div>
      )}
      {game.mvp && (
        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-amber-400">
          <Star size={10} weight="fill" />
          <span>MVP: {game.mvp}</span>
        </div>
      )}
    </div>
  )
}

function HeroBanCard({
  game,
  teamAName,
  teamBName,
}: {
  game: MatchGame
  teamAName: string
  teamBName: string
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-2 block">
        Game {game.game_number}
      </span>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-stone-500 block mb-1">
            {teamAName}
          </span>
          <div className="flex flex-wrap gap-1">
            {game.hero_bans?.team_a.map((hero, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400"
              >
                <Prohibit size={8} />
                {hero}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-stone-500 block mb-1">
            {teamBName}
          </span>
          <div className="flex flex-wrap gap-1">
            {game.hero_bans?.team_b.map((hero, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400"
              >
                <Prohibit size={8} />
                {hero}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
