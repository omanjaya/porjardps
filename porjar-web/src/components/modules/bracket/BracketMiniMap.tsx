'use client'

import { useCallback, useRef, useState } from 'react'
import { MapTrifold, X } from '@phosphor-icons/react'
import type { MatchPosition } from './bracketLayout'
import {
  MATCH_WIDTH,
  MATCH_HEIGHT,
} from './bracketLayout'

interface BracketMiniMapProps {
  contentWidth: number
  contentHeight: number
  viewportWidth: number
  viewportHeight: number
  panX: number
  panY: number
  zoom: number
  onNavigate: (panX: number, panY: number) => void
  fitsInView: boolean
  positions?: MatchPosition[]
  liveMatchIds?: Set<string>
}

const MAP_WIDTH = 152
const MAP_HEIGHT = 96

export function BracketMiniMap({
  contentWidth,
  contentHeight,
  viewportWidth,
  viewportHeight,
  panX,
  panY,
  zoom,
  onNavigate,
  fitsInView,
  positions = [],
  liveMatchIds = new Set(),
}: BracketMiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  const scale = Math.min(
    contentWidth > 0 ? MAP_WIDTH / contentWidth : 1,
    contentHeight > 0 ? MAP_HEIGHT / contentHeight : 1
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mapRef.current) return
      const rect = mapRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      const contentX = clickX / scale
      const contentY = clickY / scale

      const newPanX = -(contentX - viewportWidth / zoom / 2) * zoom
      const newPanY = -(contentY - viewportHeight / zoom / 2) * zoom

      onNavigate(newPanX, newPanY)
    },
    [scale, zoom, viewportWidth, viewportHeight, onNavigate]
  )

  // All hooks must run before early return
  if (fitsInView || contentWidth <= 0 || contentHeight <= 0) return null

  const vpWidth = (viewportWidth / zoom) * scale
  const vpHeight = (viewportHeight / zoom) * scale
  const vpX = (-panX / zoom) * scale
  const vpY = (-panY / zoom) * scale

  // Node dimensions in minimap space
  const nodeW = Math.max(2, MATCH_WIDTH * scale)
  const nodeH = Math.max(1, MATCH_HEIGHT * scale)

  return (
    <div className="absolute bottom-14 right-4 z-30 flex flex-col items-end gap-1">
      {/* Toggle button */}
      <button
        onClick={() => setVisible((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-stone-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-stone-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-stone-50 hover:text-stone-700"
        title={visible ? 'Sembunyikan minimap' : 'Tampilkan minimap'}
      >
        {visible ? (
          <>
            <X size={10} />
            <span>Minimap</span>
          </>
        ) : (
          <>
            <MapTrifold size={10} />
            <span>Minimap</span>
          </>
        )}
      </button>

      {/* Minimap panel */}
      {visible && (
        <div
          ref={mapRef}
          onClick={handleClick}
          className="relative cursor-crosshair overflow-hidden rounded-lg border border-stone-300/60 bg-slate-900/85 shadow-lg backdrop-blur-sm transition-opacity"
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
          title="Klik untuk berpindah ke area ini"
        >
          {/* Match nodes */}
          <svg
            className="absolute inset-0"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            style={{ pointerEvents: 'none' }}
          >
            {positions.map((pos) => {
              const x = pos.x * scale
              const y = pos.y * scale
              const status = pos.match.status
              const isLive = liveMatchIds.has(pos.match.id)

              let fill = '#64748b' // pending/scheduled → slate-500
              if (isLive || status === 'live') fill = '#ef4444'          // live → red-500
              else if (status === 'completed') fill = '#22c55e'          // completed → green-500
              else if (status === 'bye') fill = '#374151'                // bye → gray-700

              return (
                <rect
                  key={pos.match.id}
                  x={x}
                  y={y}
                  width={Math.max(nodeW, 3)}
                  height={Math.max(nodeH, 2)}
                  rx={1}
                  fill={fill}
                  opacity={0.85}
                />
              )
            })}
          </svg>

          {/* Viewport indicator */}
          <div
            className="absolute rounded-sm border border-white/70 bg-white/10 transition-all duration-75"
            style={{
              left: Math.max(0, vpX),
              top: Math.max(0, vpY),
              width: Math.min(vpWidth, MAP_WIDTH - Math.max(0, vpX)),
              height: Math.min(vpHeight, MAP_HEIGHT - Math.max(0, vpY)),
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
            }}
          />

          {/* Legend row */}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-end gap-2">
            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-[8px] text-slate-400">Live</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[8px] text-slate-400">Selesai</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="text-[8px] text-slate-400">Belum</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
