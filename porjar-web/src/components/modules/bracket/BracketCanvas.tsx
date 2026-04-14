import React, { useMemo } from 'react'
import { BracketConnector } from './BracketConnector'
import { MatchNode } from './MatchNode'
import { resolveMediaUrl } from '@/lib/api'
import type { MatchPosition } from './bracketLayout'
import type { TeamSummary } from '@/types'
import { MATCH_WIDTH, MATCH_HEIGHT, PADDING_X, PADDING_Y, ROUND_GAP } from './bracketLayout'

// Build a map: matchId → array of match_numbers whose losers drop into it
function buildLoserFromMap(positions: MatchPosition[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  positions.forEach(({ match }) => {
    if (match.loser_next_match_id) {
      const existing = map.get(match.loser_next_match_id) ?? []
      map.set(match.loser_next_match_id, [...existing, match.match_number])
    }
  })
  return map
}

interface ConnectorData {
  fromX: number
  fromY: number
  toX: number
  toY: number
  isWinnerPath: boolean
  isLivePath: boolean
  isLoserPath?: boolean
}

interface PodiumPlacements {
  first: TeamSummary
  second: TeamSummary | null
  third: TeamSummary | null
}

interface BracketCanvasProps {
  contentRef: React.RefObject<HTMLDivElement | null>
  panX: number
  panY: number
  zoom: number
  contentWidth: number
  contentHeight: number
  connectors: ConnectorData[]
  positions: MatchPosition[]
  liveSet: Set<string>
  searchMatchIds: Set<string>
  winnerHighlightPaths: Set<string>
  highlightTeamId?: string
  roundLabels: Record<number, string>
  onMatchClick?: (matchId: string) => void
  grandFinalWinner?: TeamSummary | null
  podiumPlacements?: PodiumPlacements | null
  tournamentName?: string
  gameLogoUrl?: string | null
  swapMode?: boolean
  swapSelectedTeamId?: string | null
  onTeamClick?: (teamId: string, teamName: string, matchId: string) => void
}

export function BracketCanvas({
  contentRef,
  panX,
  panY,
  zoom,
  contentWidth,
  contentHeight,
  connectors,
  positions,
  liveSet,
  searchMatchIds,
  winnerHighlightPaths,
  highlightTeamId,
  roundLabels,
  onMatchClick,
  grandFinalWinner,
  podiumPlacements,
  tournamentName,
  gameLogoUrl,
  swapMode,
  swapSelectedTeamId,
  onTeamClick,
}: BracketCanvasProps) {
  const loserFromMap = useMemo(() => buildLoserFromMap(positions), [positions])

  // Section divider: midpoint between bottom of last UB match and top of first LB match
  const sectionDivider = useMemo(() => {
    const ubMatches = positions.filter((p) => p.match.bracket_position === 'winners')
    const lbMatches = positions.filter((p) => p.match.bracket_position === 'losers')
    if (ubMatches.length === 0 || lbMatches.length === 0) return null
    const ubBottom = ubMatches.reduce((max, p) => Math.max(max, p.y + MATCH_HEIGHT), 0)
    const lbTop = lbMatches.reduce((min, p) => Math.min(min, p.y), Infinity)
    const midY = (ubBottom + lbTop) / 2
    const ubLabelY = ubMatches.reduce((min, p) => Math.min(min, p.y), Infinity)
    const lbLabelY = lbTop
    return { midY, ubLabelY, lbLabelY }
  }, [positions])

  // Winner card position — right of the final match column
  const winnerCardPos = useMemo(() => {
    if (!grandFinalWinner) return null
    // Find the final match position: grand_final or the completed terminal match with the winner
    let finalPos = positions.find((p) => p.match.bracket_position === 'grand_final')
    if (!finalPos) {
      // Single elimination: find the terminal match that has winner feeders
      finalPos = positions.find(
        (p) => p.match.winner?.id === grandFinalWinner.id && !p.match.next_match_id
      )
    }
    if (!finalPos) return null
    return {
      x: finalPos.x + MATCH_WIDTH + ROUND_GAP,
      y: finalPos.y,
    }
  }, [positions, grandFinalWinner])

  return (
    <div
      ref={contentRef}
      className="absolute"
      style={{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: '0 0',
        width: contentWidth,
        height: contentHeight,
      }}
    >
      {/* Section labels + divider line — only for double elimination */}
      {sectionDivider && (
        <>
          {/* Upper Bracket label */}
          <div
            className="absolute flex items-center gap-1.5 pointer-events-none select-none"
            style={{ left: PADDING_X, top: sectionDivider.ubLabelY - 26 }}
          >
            <div className="w-1.5 h-3 rounded-sm bg-sky-400" />
            <span className="text-[10px] font-bold tracking-[0.12em] text-sky-600 dark:text-sky-400 uppercase">
              Upper Bracket
            </span>
          </div>

          {/* Horizontal divider */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: PADDING_X - 8,
              top: sectionDivider.midY,
              width: contentWidth - PADDING_X * 2 + 16,
              height: 1,
              background: 'linear-gradient(to right, transparent, #d6d3d1 8%, #d6d3d1 92%, transparent)',
            }}
          />
          <div
            className="absolute pointer-events-none text-[9px] font-semibold text-stone-400 dark:text-zinc-500 tracking-widest uppercase"
            style={{
              left: PADDING_X,
              top: sectionDivider.midY - 10,
            }}
          >
            · · ·
          </div>

          {/* Lower Bracket label */}
          <div
            className="absolute flex items-center gap-1.5 pointer-events-none select-none"
            style={{ left: PADDING_X, top: sectionDivider.lbLabelY - 26 }}
          >
            <div className="w-1.5 h-3 rounded-sm bg-amber-400" />
            <span className="text-[10px] font-bold tracking-[0.12em] text-amber-600 dark:text-amber-400 uppercase">
              Lower Bracket
            </span>
          </div>
        </>
      )}

      {/* SVG layer for connectors */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={contentWidth}
        height={contentHeight}
        style={{ overflow: 'visible' }}
      >
        {connectors.map((conn, i) => (
          <BracketConnector
            key={i}
            fromX={conn.fromX}
            fromY={conn.fromY}
            toX={conn.toX}
            toY={conn.toY}
            isWinnerPath={conn.isWinnerPath}
            isLivePath={conn.isLivePath}
            isLoserPath={conn.isLoserPath}
          />
        ))}

        {/* Connector line from GF to winner card */}
        {winnerCardPos && (
          <path
            d={`M ${winnerCardPos.x - ROUND_GAP + MATCH_WIDTH} ${winnerCardPos.y + MATCH_HEIGHT / 2} H ${winnerCardPos.x}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="6 3"
            opacity="0.6"
          />
        )}
      </svg>

      {/* Match nodes */}
      {useMemo(
        () =>
          positions.map((pos) => (
            <div
              key={pos.match.id}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                width: MATCH_WIDTH,
              }}
            >
              <MatchNode
                match={pos.match}
                isLive={liveSet.has(pos.match.id)}
                isHighlighted={
                  searchMatchIds.has(pos.match.id) ||
                  winnerHighlightPaths.has(pos.match.id)
                }
                highlightTeamId={highlightTeamId}
                roundLabel={roundLabels[pos.match.round]}
                loserFromNumbers={loserFromMap.get(pos.match.id)}
                onClick={onMatchClick}
                swapMode={swapMode}
                swapSelectedTeamId={swapSelectedTeamId}
                onTeamClick={onTeamClick}
              />
            </div>
          )),
        [positions, liveSet, searchMatchIds, winnerHighlightPaths, highlightTeamId, roundLabels, loserFromMap, onMatchClick, swapMode, swapSelectedTeamId, onTeamClick]
      )}

      {/* Podium / Winner card */}
      {winnerCardPos && podiumPlacements ? (
        <PodiumCard
          x={winnerCardPos.x}
          y={winnerCardPos.y}
          placements={podiumPlacements}
          tournamentName={tournamentName}
          gameLogoUrl={gameLogoUrl}
        />
      ) : winnerCardPos && grandFinalWinner ? (
        <WinnerCard
          x={winnerCardPos.x}
          y={winnerCardPos.y}
          winner={grandFinalWinner}
          tournamentName={tournamentName}
          gameLogoUrl={gameLogoUrl}
        />
      ) : null}
    </div>
  )
}

// ─── Podium Card (Juara 1, 2, 3) ───────────────────────────────────────

function PodiumCard({
  x,
  y,
  placements,
  tournamentName,
  gameLogoUrl,
}: {
  x: number
  y: number
  placements: PodiumPlacements
  tournamentName?: string
  gameLogoUrl?: string | null
}) {
  const [gameImgErr, setGameImgErr] = React.useState(false)
  const gameLogo = resolveMediaUrl(gameLogoUrl)

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: y - 40, width: 340 }}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4 bg-gradient-to-r from-amber-400/20 via-yellow-300/20 to-amber-400/20 rounded-xl px-4 py-2.5 border border-amber-200/60">
        {gameLogo && !gameImgErr ? (
          <img
            src={gameLogo}
            alt="game"
            className="h-6 w-6 rounded object-contain"
            onError={() => setGameImgErr(true)}
          />
        ) : null}
        {tournamentName && (
          <span className="text-[11px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-wide text-center">
            {tournamentName}
          </span>
        )}
      </div>

      {/* Podium — 2nd | 1st (elevated) | 3rd */}
      <div className="flex items-end justify-center gap-2">
        {/* 2nd place — left */}
        {placements.second && (
          <PodiumColumn rank={2} team={placements.second} />
        )}

        {/* 1st place — center, elevated */}
        <PodiumColumn rank={1} team={placements.first} />

        {/* 3rd place — right */}
        {placements.third && (
          <PodiumColumn rank={3} team={placements.third} />
        )}
      </div>
    </div>
  )
}

const PODIUM_CONFIG = {
  1: {
    emoji: '\uD83C\uDFC6',
    label: 'Juara 1',
    borderColor: 'border-amber-300',
    bgCard: 'bg-gradient-to-b from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30',
    bgPodium: 'bg-gradient-to-t from-amber-400 to-yellow-300',
    accent: 'text-amber-600 dark:text-amber-400',
    podiumH: 'h-16',
    shadow: '0 0 20px rgba(245,158,11,0.2), 0 2px 8px rgba(0,0,0,0.08)',
    logoSize: 'h-14 w-14',
    nameSize: 'text-[12px] font-black',
    schoolSize: 'text-[10px]',
    width: 'w-[120px]',
  },
  2: {
    emoji: '\uD83E\uDD48',
    label: 'Runner Up',
    borderColor: 'border-stone-300 dark:border-zinc-600',
    bgCard: 'bg-gradient-to-b from-stone-50 to-slate-50 dark:from-zinc-800/60 dark:to-zinc-800/40',
    bgPodium: 'bg-gradient-to-t from-stone-400 to-stone-300',
    accent: 'text-stone-500 dark:text-stone-400',
    podiumH: 'h-10',
    shadow: '0 1px 6px rgba(0,0,0,0.06)',
    logoSize: 'h-10 w-10',
    nameSize: 'text-[11px] font-bold',
    schoolSize: 'text-[9px]',
    width: 'w-[100px]',
  },
  3: {
    emoji: '\uD83E\uDD49',
    label: 'Peringkat 3',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
    bgCard: 'bg-gradient-to-b from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20',
    bgPodium: 'bg-gradient-to-t from-orange-400 to-orange-300',
    accent: 'text-orange-500 dark:text-orange-400',
    podiumH: 'h-7',
    shadow: '0 1px 4px rgba(0,0,0,0.04)',
    logoSize: 'h-10 w-10',
    nameSize: 'text-[11px] font-bold',
    schoolSize: 'text-[9px]',
    width: 'w-[100px]',
  },
} as const

function PodiumColumn({ rank, team }: { rank: 1 | 2 | 3; team: TeamSummary }) {
  const [imgErr, setImgErr] = React.useState(false)
  const logo = resolveMediaUrl(team.school_logo_url ?? team.logo_url)
  const cfg = PODIUM_CONFIG[rank]
  const isFirst = rank === 1

  return (
    <div className={`flex flex-col items-center ${cfg.width}`}>
      {/* Team card */}
      <div
        className={`${cfg.width} rounded-xl border ${cfg.borderColor} ${cfg.bgCard} p-2.5 flex flex-col items-center gap-1.5`}
        style={{ boxShadow: cfg.shadow }}
      >
        {/* Crown for 1st */}
        {isFirst && (
          <span className="text-base -mb-1">{'\uD83D\uDC51'}</span>
        )}

        {/* Team logo */}
        {logo && !imgErr ? (
          <img
            src={logo}
            alt={team.name}
            className={`${cfg.logoSize} rounded-lg object-contain bg-white dark:bg-zinc-800 shadow-sm border border-stone-100 dark:border-zinc-700`}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className={`${cfg.logoSize} rounded-lg bg-stone-100 dark:bg-zinc-700 flex items-center justify-center font-black text-stone-400 dark:text-zinc-500 ${isFirst ? 'text-xl' : 'text-base'}`}>
            {team.name.charAt(0)}
          </div>
        )}

        {/* Team name — no truncation */}
        <p className={`${cfg.nameSize} text-stone-900 dark:text-zinc-100 leading-tight text-center break-words`}>
          {team.name}
        </p>

        {/* School name — no truncation */}
        {team.school_name && (
          <p className={`${cfg.schoolSize} text-stone-400 dark:text-zinc-500 text-center leading-snug break-words`}>
            {team.school_name}
          </p>
        )}
      </div>

      {/* Podium block */}
      <div className={`${cfg.width} ${cfg.podiumH} ${cfg.bgPodium} rounded-b-lg mt-0 flex items-center justify-center`}>
        <span className={`${cfg.accent} font-black text-[10px] uppercase tracking-widest drop-shadow-sm`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>
    </div>
  )
}

// ─── Legacy Winner Card (fallback for single elimination without podium) ───

function WinnerCard({
  x,
  y,
  winner,
  tournamentName,
  gameLogoUrl,
}: {
  x: number
  y: number
  winner: TeamSummary
  tournamentName?: string
  gameLogoUrl?: string | null
}) {
  const [teamImgErr, setTeamImgErr] = React.useState(false)
  const [schoolImgErr, setSchoolImgErr] = React.useState(false)
  const [gameImgErr, setGameImgErr] = React.useState(false)

  const teamLogo = resolveMediaUrl(winner.logo_url)
  const schoolLogo = resolveMediaUrl(winner.school_logo_url)
  const gameLogo = resolveMediaUrl(gameLogoUrl)

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: y - 40, width: 240 }}
    >
      {/* Trophy label */}
      <div className="flex items-center justify-center gap-1 mb-2">
        <span className="text-amber-500 text-base">{'\uD83C\uDFC6'}</span>
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-600">
          Tournament Winner
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-zinc-900 shadow-lg overflow-hidden"
        style={{ boxShadow: '0 0 24px rgba(245,158,11,0.18), 0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* Game logo / tournament header */}
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400/20 to-yellow-300/20 px-3 py-2 border-b border-amber-200/60">
          {gameLogo && !gameImgErr ? (
            <img
              src={gameLogo}
              alt="game"
              className="h-6 w-6 rounded object-contain"
              onError={() => setGameImgErr(true)}
            />
          ) : (
            <div className="h-6 w-6 rounded bg-amber-200/60 flex items-center justify-center text-amber-600 text-[10px] font-bold">
              G
            </div>
          )}
          {tournamentName && (
            <span className="text-[11px] font-semibold text-stone-600 dark:text-zinc-400 text-center">
              {tournamentName}
            </span>
          )}
        </div>

        {/* Team info */}
        <div className="px-4 py-4 flex flex-col items-center gap-2.5">
          {/* Team logo */}
          <div className="relative">
            {teamLogo && !teamImgErr ? (
              <img
                src={teamLogo}
                alt={winner.name}
                className="h-16 w-16 rounded-xl object-contain bg-white dark:bg-zinc-800 shadow-sm border border-stone-100 dark:border-zinc-700"
                onError={() => setTeamImgErr(true)}
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 text-2xl font-black shadow-sm">
                {winner.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Crown badge */}
            <div className="absolute -top-2 -right-2 text-sm">{'\uD83D\uDC51'}</div>
          </div>

          {/* Team name — no truncation */}
          <div className="text-center">
            <p className="text-[14px] font-black text-stone-900 dark:text-zinc-100 leading-tight break-words">
              {winner.name}
            </p>
          </div>

          {/* School — no truncation */}
          {(winner.school_name || winner.school_logo_url) && (
            <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-zinc-800/50 rounded-lg px-3 py-1.5 border border-stone-200/60 dark:border-zinc-700/60 w-full justify-center">
              {schoolLogo && !schoolImgErr && (
                <img
                  src={schoolLogo}
                  alt="school"
                  className="h-5 w-5 rounded object-contain flex-shrink-0"
                  onError={() => setSchoolImgErr(true)}
                />
              )}
              {winner.school_name && (
                <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium text-center break-words">
                  {winner.school_name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
