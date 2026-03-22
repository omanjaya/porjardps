import { useMemo } from 'react'
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
  tournamentName?: string
  gameLogoUrl?: string | null
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
  tournamentName,
  gameLogoUrl,
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

  // Winner card position — right of the last GF match column
  const winnerCardPos = useMemo(() => {
    const gfMatches = positions.filter((p) => p.match.bracket_position === 'grand_final')
    if (gfMatches.length === 0 || !grandFinalWinner) return null
    const gfX = gfMatches.reduce((max, p) => Math.max(max, p.x), 0)
    const gfY = gfMatches[0].y
    return {
      x: gfX + MATCH_WIDTH + ROUND_GAP,
      y: gfY,
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
            <span className="text-[10px] font-bold tracking-[0.12em] text-sky-600 uppercase">
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
            className="absolute pointer-events-none text-[9px] font-semibold text-stone-400 tracking-widest uppercase"
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
            <span className="text-[10px] font-bold tracking-[0.12em] text-amber-600 uppercase">
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
              />
            </div>
          )),
        [positions, liveSet, searchMatchIds, winnerHighlightPaths, highlightTeamId, roundLabels, loserFromMap, onMatchClick]
      )}

      {/* Winner card */}
      {winnerCardPos && grandFinalWinner && (
        <WinnerCard
          x={winnerCardPos.x}
          y={winnerCardPos.y}
          winner={grandFinalWinner}
          tournamentName={tournamentName}
          gameLogoUrl={gameLogoUrl}
        />
      )}
    </div>
  )
}

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
      style={{ left: x, top: y - 40, width: 200 }}
    >
      {/* Trophy label */}
      <div className="flex items-center justify-center gap-1 mb-2">
        <span className="text-amber-500 text-base">🏆</span>
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-600">
          Tournament Winner
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-lg overflow-hidden"
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
            <span className="text-[10px] font-semibold text-stone-600 truncate max-w-[130px]">
              {tournamentName}
            </span>
          )}
        </div>

        {/* Team info */}
        <div className="px-3 py-3 flex flex-col items-center gap-2">
          {/* Team logo */}
          <div className="relative">
            {teamLogo && !teamImgErr ? (
              <img
                src={teamLogo}
                alt={winner.name}
                className="h-16 w-16 rounded-xl object-contain bg-white shadow-sm border border-stone-100"
                onError={() => setTeamImgErr(true)}
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 text-2xl font-black shadow-sm">
                {winner.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Crown badge */}
            <div className="absolute -top-2 -right-2 text-sm">👑</div>
          </div>

          {/* Team name */}
          <div className="text-center">
            <p className="text-[13px] font-black text-stone-900 leading-tight">
              {winner.name}
            </p>
          </div>

          {/* School */}
          {(winner.school_name || winner.school_logo_url) && (
            <div className="flex items-center gap-1.5 bg-stone-50 rounded-lg px-2 py-1 border border-stone-200/60 w-full justify-center">
              {schoolLogo && !schoolImgErr && (
                <img
                  src={schoolLogo}
                  alt="school"
                  className="h-5 w-5 rounded object-contain flex-shrink-0"
                  onError={() => setSchoolImgErr(true)}
                />
              )}
              {winner.school_name && (
                <span className="text-[10px] text-stone-500 font-medium truncate">
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

// React import needed for useState in WinnerCard
import React from 'react'
