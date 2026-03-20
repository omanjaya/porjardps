import { useMemo } from 'react'
import { BracketConnector } from './BracketConnector'
import { MatchNode } from './MatchNode'
import type { MatchPosition } from './bracketLayout'
import { MATCH_WIDTH, MATCH_HEIGHT, PADDING_X, PADDING_Y } from './bracketLayout'

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
}: BracketCanvasProps) {
  const loserFromMap = useMemo(() => buildLoserFromMap(positions), [positions])

  // Compute y boundaries for section labels
  const sectionBounds = useMemo(() => {
    const lowerIds = new Set(loserFromMap.keys())
    if (lowerIds.size === 0) return null
    let lowerMinY = Infinity
    positions.forEach(({ match, y }) => {
      if (lowerIds.has(match.id)) lowerMinY = Math.min(lowerMinY, y)
    })
    return { upperY: PADDING_Y, lowerY: lowerMinY }
  }, [positions, loserFromMap])

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
      {/* Section labels — only for double elimination */}
      {sectionBounds && (
        <>
          <div
            className="absolute flex items-center gap-1.5 pointer-events-none"
            style={{ left: PADDING_X, top: sectionBounds.upperY - 24 }}
          >
            <div className="w-1.5 h-3 rounded-sm bg-stone-300/80" />
            <span className="text-[10px] font-bold tracking-[0.12em] text-stone-400 uppercase">
              Upper Bracket
            </span>
          </div>

          <div
            className="absolute flex items-center gap-1.5 pointer-events-none"
            style={{ left: PADDING_X, top: sectionBounds.lowerY - 24 }}
          >
            <div className="w-1.5 h-3 rounded-sm bg-amber-400/70" />
            <span className="text-[10px] font-bold tracking-[0.12em] text-amber-500/90 uppercase">
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
    </div>
  )
}
