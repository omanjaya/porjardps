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
}

export function BracketView({
  matches,
  rounds,
  format = 'single_elimination',
  onMatchClick,
  liveMatchIds = [],
  highlightTeamId,
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

  // Content bounds
  const contentWidth = useMemo(() => {
    if (positions.length === 0) return 0
    return Math.max(...positions.map((p) => p.x)) + MATCH_WIDTH + PADDING_X * 2
  }, [positions])

  const contentHeight = useMemo(() => {
    if (positions.length === 0) return 0
    return Math.max(...positions.map((p) => p.y)) + MATCH_HEIGHT + PADDING_Y * 2
  }, [positions])

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
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
    visibleRounds.forEach((round, i) => {
      labels[round] = getRoundLabel(i, visibleRoundCount, format)
    })
    return labels
  }, [visibleRounds, visibleRoundCount, format])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-porjar-bg select-none',
        isFullscreen ? 'h-screen' : 'h-[calc(100vh-200px)] min-h-[400px] rounded-xl border border-stone-200',
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <BracketBackground />

      {/* Round headers (sticky at top) */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-porjar-bg/80 backdrop-blur-sm border-b border-stone-200/50 py-2">
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
      />

      {/* Mobile landscape hint */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 sm:hidden">
        <div className="rounded-full bg-white/90 border border-stone-200 px-3 py-1 text-[10px] text-stone-500">
          Pinch to zoom, drag to pan
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
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-stone-200 bg-white/95 text-stone-500 hover:text-stone-700'
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
