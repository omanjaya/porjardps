'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BracketControls } from './BracketControls'
import { BracketRoundHeader, getRoundLabel } from './BracketRoundHeader'

import { BracketExport } from './BracketExport'
import { BracketBackground } from './BracketBackground'
import { BracketCanvas } from './BracketCanvas'
import { useBracketInteraction } from './useBracketInteraction'
import {
  calculatePositions,
  MATCH_WIDTH,
  MATCH_HEIGHT,
  ROUND_GAP,
  PADDING_X,
  PADDING_Y,
} from './bracketLayout'
import type { BracketMatch } from '@/types'

interface BracketViewProps {
  matches: BracketMatch[]
  rounds: number
  format?: 'single_elimination' | 'double_elimination' | 'round_robin'
  onMatchClick?: (matchId: string) => void
  liveMatchIds?: string[]
  highlightTeamId?: string
  bestOf?: number
  isAdmin?: boolean
  tournamentName?: string
  gameLogoUrl?: string | null
  swapMode?: boolean
  swapSelectedTeamId?: string | null
  onTeamClick?: (teamId: string, teamName: string, matchId: string) => void
}

export function BracketView({
  matches,
  rounds,
  format = 'single_elimination',
  onMatchClick,
  liveMatchIds = [],
  highlightTeamId,
  tournamentName,
  gameLogoUrl,
  swapMode,
  swapSelectedTeamId,
  onTeamClick,
}: BracketViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showLoserPaths, setShowLoserPaths] = useState(false)

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Stabilize liveMatchIds — only update the Set when the actual IDs change
  const prevLiveRef = useRef<string>('')
  const liveSet = useMemo(() => {
    const key = JSON.stringify(liveMatchIds)
    prevLiveRef.current = key
    return new Set(liveMatchIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(liveMatchIds)])

  // Calculate match positions
  const positions = useMemo(
    () => calculatePositions(matches, rounds),
    [matches, rounds]
  )

  // Find the "final" match — either grand_final position or the single-elimination final.
  // For SE: the final is the match with no next_match_id that receives feeders via
  // next_match_id (as opposed to the third-place match which receives via loser_next_match_id).
  const finalMatch = useMemo(() => {
    // Try grand_final first (double elimination)
    const gf = matches.find((m) => m.bracket_position === 'grand_final')
    if (gf) return gf

    // Single elimination: find terminal matches (no next_match_id)
    const terminals = matches.filter((m) => !m.next_match_id && m.team_a && m.team_b)
    if (terminals.length === 0) return null
    if (terminals.length === 1) return terminals[0]

    // Multiple terminals (final + third-place): the final is fed by winners (next_match_id),
    // the third-place is fed by losers (loser_next_match_id).
    // The final has feeder matches whose next_match_id points to it.
    const feedCountByNext = new Map<string, number>()
    for (const m of matches) {
      if (m.next_match_id) feedCountByNext.set(m.next_match_id, (feedCountByNext.get(m.next_match_id) ?? 0) + 1)
    }
    const finalByFeeders = terminals.find((t) => (feedCountByNext.get(t.id) ?? 0) > 0)
    return finalByFeeders ?? terminals.reduce((a, b) => a.round > b.round ? a : b)
  }, [matches])

  // Grand final winner (for winner card)
  const grandFinalWinner = useMemo(() => {
    return finalMatch?.winner ?? null
  }, [finalMatch])

  // Podium placements (1st, 2nd, 3rd)
  const podiumPlacements = useMemo(() => {
    if (!finalMatch || finalMatch.status !== 'completed' || !finalMatch.winner) return null

    const first = finalMatch.winner
    // 2nd = final loser
    const second = finalMatch.team_a?.id === finalMatch.winner.id ? finalMatch.team_b : finalMatch.team_a

    // 3rd place
    let third: typeof first | null = null
    if (format === 'double_elimination') {
      const lbMatches = matches.filter((m) => m.bracket_position === 'losers')
      const lbFinal = lbMatches.sort((a, b) => b.round - a.round)[0]
      if (lbFinal?.status === 'completed' && lbFinal.winner) {
        third = lbFinal.team_a?.id === lbFinal.winner.id ? lbFinal.team_b ?? null : lbFinal.team_a ?? null
      }
    } else {
      // Single elimination: check third-place match first
      const thirdPlaceMatch = matches.find(
        (m) => !m.next_match_id && m.id !== finalMatch.id && m.status === 'completed' && m.winner
      )
      if (thirdPlaceMatch) {
        // Third-place match winner = 3rd place
        third = thirdPlaceMatch.winner ?? null
      } else {
        // No third-place match: 3rd = first semi-final loser found
        const finalRound = finalMatch.round
        const semiFinals = matches.filter((m) => m.round === finalRound - 1 && m.status === 'completed')
        for (const sf of semiFinals) {
          if (sf.winner) {
            const loser = sf.team_a?.id === sf.winner.id ? sf.team_b : sf.team_a
            if (loser) { third = loser; break }
          }
        }
      }
    }

    return { first, second: second ?? null, third }
  }, [matches, format, finalMatch])

  // Winner card width: extra column after GF
  const WINNER_CARD_GAP = ROUND_GAP
  const WINNER_CARD_WIDTH = 340

  // Content bounds
  const contentWidth = useMemo(() => {
    if (positions.length === 0) return 0
    const base = Math.max(...positions.map((p) => p.x)) + MATCH_WIDTH + PADDING_X * 2
    return grandFinalWinner ? base + WINNER_CARD_GAP + WINNER_CARD_WIDTH + PADDING_X : base
  }, [positions, grandFinalWinner, WINNER_CARD_GAP, WINNER_CARD_WIDTH])

  // Podium/winner card can extend well below the GF match position
  // Estimate: podium header (~56px) + card content (~200px) + podium block (64px) = ~320px from top of card
  // Card starts at y - 40, so bottom ≈ y + 280
  const WINNER_CARD_HEIGHT = 320

  const contentHeight = useMemo(() => {
    if (positions.length === 0) return 0
    const matchBottom = Math.max(...positions.map((p) => p.y)) + MATCH_HEIGHT + PADDING_Y * 2
    if (!grandFinalWinner) return matchBottom
    // Find GF match y to calculate podium bottom
    const gfPositions = positions.filter((p) => p.match.bracket_position === 'grand_final')
    if (gfPositions.length === 0) return matchBottom
    const gfY = gfPositions[0].y
    const podiumBottom = gfY - 40 + WINNER_CARD_HEIGHT + PADDING_Y
    return Math.max(matchBottom, podiumBottom)
  }, [positions, grandFinalWinner])

  const {
    zoom,
    panX,
    panY,
    isPanning,
    containerRef,
    contentRef,
    containerSize,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    fitToScreen,
    toggleFullscreen,
    isFullscreen,
    setZoom,
    handleMiniMapNavigate,
  } = useBracketInteraction({ contentWidth, contentHeight })


  // Build connector data
  const connectors = useMemo(() => {
    const result: {
      fromX: number
      fromY: number
      toX: number
      toY: number
      isWinnerPath: boolean
      isLivePath: boolean
      isLoserPath?: boolean
    }[] = []

    // Create a position lookup by match ID
    const posMap = new Map(positions.map((p) => [p.match.id, p]))

    // Winners bracket connectors (next_match_id)
    positions.forEach((pos) => {
      const { match } = pos
      if (match.next_match_id) {
        const nextPos = posMap.get(match.next_match_id)
        if (nextPos) {
          const fromX = pos.x + MATCH_WIDTH
          const fromY = pos.y + MATCH_HEIGHT / 2
          const toX = nextPos.x
          const toY = nextPos.y + MATCH_HEIGHT / 2

          const isWinnerPath =
            match.status === 'completed' && match.winner != null
          const isLivePath =
            liveSet.has(match.id) || liveSet.has(match.next_match_id)

          result.push({ fromX, fromY, toX, toY, isWinnerPath, isLivePath })
        }
      }
    })

    // Loser bracket connectors (loser_next_match_id)
    positions.forEach((pos) => {
      const { match } = pos
      if (match.loser_next_match_id) {
        const nextPos = posMap.get(match.loser_next_match_id)
        if (nextPos) {
          const fromX = pos.x + MATCH_WIDTH
          // Loser connector exits from the bottom of the match node
          const fromY = pos.y + MATCH_HEIGHT
          const toX = nextPos.x
          const toY = nextPos.y + MATCH_HEIGHT / 2

          result.push({
            fromX,
            fromY,
            toX,
            toY,
            isWinnerPath: false,
            isLivePath: false,
            isLoserPath: true,
          })
        }
      }
    })

    // Filter loser paths when toggled off
    return showLoserPaths ? result : result.filter((c) => !c.isLoserPath)
  }, [positions, liveSet, showLoserPaths])

  // Winner path highlight
  const winnerHighlightPaths = useMemo(() => {
    if (!highlightTeamId) return new Set<string>()
    const highlighted = new Set<string>()
    positions.forEach((pos) => {
      const m = pos.match
      if (
        m.team_a?.id === highlightTeamId ||
        m.team_b?.id === highlightTeamId
      ) {
        highlighted.add(m.id)
      }
    })
    return highlighted
  }, [positions, highlightTeamId])

  // Search matching (uses debounced query)
  const searchMatchIds = useMemo(() => {
    if (!debouncedSearch.trim()) return new Set<string>()
    const q = debouncedSearch.toLowerCase()
    const ids = new Set<string>()
    matches.forEach((m) => {
      if (
        m.team_a?.name?.toLowerCase().includes(q) ||
        m.team_b?.name?.toLowerCase().includes(q)
      ) {
        ids.add(m.id)
      }
    })
    return ids
  }, [matches, debouncedSearch])

  const hasLoserPaths = useMemo(
    () => positions.some((p) => p.match.loser_next_match_id),
    [positions]
  )

  const fitsInView = useMemo(() => {
    return (
      contentWidth * zoom <= containerSize.width &&
      contentHeight * zoom <= containerSize.height
    )
  }, [contentWidth, contentHeight, zoom, containerSize])

  // Visible rounds = unique round numbers from positioned matches
  const visibleRounds = useMemo(() => {
    const roundSet = new Set(positions.map((p) => p.match.round))
    return Array.from(roundSet).sort((a, b) => a - b)
  }, [positions])

  const visibleRoundCount = visibleRounds.length

  // Memoized zoom callbacks
  const handleZoomIn = useCallback(
    () => setZoom((z: number) => Math.min(3, z + 0.2)),
    [setZoom]
  )
  const handleZoomOut = useCallback(
    () => setZoom((z: number) => Math.max(0.2, z - 0.2)),
    [setZoom]
  )

  // Share: copy current URL to clipboard
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast('Link disalin!')
    })
  }, [])

  // Round labels for match nodes — map actual round numbers to display labels
  const roundLabels = useMemo(() => {
    const labels: Record<number, string> = {}

    if (format === 'double_elimination') {
      // Determine bracket_position for each visible round
      const roundPos = new Map<number, string>()
      matches.forEach((m) => {
        if (m.bracket_position && m.round != null) {
          roundPos.set(m.round, m.bracket_position)
        }
      })

      const wrRounds = visibleRounds.filter((r) => roundPos.get(r) === 'winners').sort((a, b) => a - b)
      const lrRounds = visibleRounds.filter((r) => roundPos.get(r) === 'losers').sort((a, b) => a - b)

      wrRounds.forEach((r, i) => {
        if (i === wrRounds.length - 1) labels[r] = 'UB Final'
        else if (wrRounds.length - 1 - i === 1) labels[r] = 'UB Semi'
        else labels[r] = `UB Round ${i + 1}`
      })

      lrRounds.forEach((r, i) => {
        labels[r] = i === lrRounds.length - 1 ? 'LB Final' : `LB Round ${i + 1}`
      })

      visibleRounds.forEach((r) => {
        if (roundPos.get(r) === 'grand_final') labels[r] = 'Grand Final'
      })
    } else {
      visibleRounds.forEach((round, i) => {
        labels[round] = getRoundLabel(i, visibleRoundCount, format)
      })
    }

    return labels
  }, [visibleRounds, visibleRoundCount, format, matches])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-esi-bg select-none',
        isFullscreen ? 'h-screen' : 'h-[calc(100vh-200px)] min-h-[400px] rounded-xl border border-stone-200 dark:border-zinc-700',
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <BracketBackground />

      {/* Round headers (sticky at top) */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-esi-bg/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-stone-200/50 dark:border-zinc-700/50 py-2">
        <div
          style={{
            transform: `translateX(${panX}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <BracketRoundHeader
            rounds={visibleRoundCount}
            format={format}
            columnWidth={MATCH_WIDTH}
            columnGap={ROUND_GAP}
            offsetX={PADDING_X}
            labelOverrides={visibleRounds.map((r) => roundLabels[r] ?? '')}
          />
        </div>
      </div>

      {/* Main bracket content */}
      <BracketCanvas
        contentRef={contentRef}
        panX={panX}
        panY={panY}
        zoom={zoom}
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        connectors={connectors}
        positions={positions}
        liveSet={liveSet}
        searchMatchIds={searchMatchIds}
        winnerHighlightPaths={winnerHighlightPaths}
        highlightTeamId={highlightTeamId}
        roundLabels={roundLabels}
        onMatchClick={onMatchClick}
        grandFinalWinner={grandFinalWinner}
        podiumPlacements={podiumPlacements}
        tournamentName={tournamentName}
        gameLogoUrl={gameLogoUrl}
        swapMode={swapMode}
        swapSelectedTeamId={swapSelectedTeamId}
        onTeamClick={onTeamClick}
      />

      {/* Mobile landscape hint — shown briefly at top-center, below round header */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 sm:hidden pointer-events-none">
        <div className="rounded-full bg-white/90 dark:bg-zinc-800/90 border border-stone-200 dark:border-zinc-700 px-3 py-1 text-[10px] text-stone-400 dark:text-zinc-500">
          Cubit untuk zoom · seret untuk geser
        </div>
      </div>

      {/* Controls */}
      <BracketControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={fitToScreen}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onShare={handleShare}
      />

      {/* Loser paths toggle — only for double elimination */}
      {hasLoserPaths && (
        <div className="absolute bottom-4 left-4 z-30">
          <button
            onClick={() => setShowLoserPaths((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium shadow-sm transition-all backdrop-blur-sm',
              showLoserPaths
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                : 'border-stone-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-800/95 text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200'
            )}
          >
            <svg width="16" height="8" className="flex-shrink-0">
              <line x1="0" y1="4" x2="16" y2="4" stroke={showLoserPaths ? '#f59e0b' : '#a8a29e'} strokeWidth="1.5" strokeDasharray="5 4" />
            </svg>
            {showLoserPaths ? 'Sembunyikan losers drop' : 'Tampilkan losers drop'}
          </button>
        </div>
      )}

      {/* Export buttons */}
      <div className="absolute bottom-4 right-4 z-30">
        <BracketExport
          bracketContentRef={contentRef}
          contentWidth={contentWidth}
          contentHeight={contentHeight}
          filename={`bracket-${format}`}
        />
      </div>

    </div>
  )
}
