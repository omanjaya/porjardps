'use client'

import { cn } from '@/lib/utils'
import {
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsIn,
  ArrowsOut,
  CornersOut,
  MagnifyingGlass,
  X,
  Share,
} from '@phosphor-icons/react'

interface BracketControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onShare?: () => void
}

export function BracketControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onToggleFullscreen,
  isFullscreen,
  searchQuery,
  onSearchChange,
  onShare,
}: BracketControlsProps) {
  return (
    <div className="absolute top-14 right-4 z-30 flex flex-col items-end gap-2">
      {/* Search bar */}
      <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 shadow-sm">
        <MagnifyingGlass size={14} className="text-stone-400 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search team..."
          className="w-32 bg-transparent text-xs text-stone-700 placeholder-stone-400 outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Zoom + action controls */}
      <div className="flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white/95 backdrop-blur-sm p-1 shadow-sm">
        <ControlButton onClick={onZoomIn} title="Zoom In">
          <MagnifyingGlassPlus size={16} />
        </ControlButton>

        <span className="px-2 text-[11px] font-medium tabular-nums text-stone-500 min-w-[40px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>

        <ControlButton onClick={onZoomOut} title="Zoom Out">
          <MagnifyingGlassMinus size={16} />
        </ControlButton>

        <div className="mx-0.5 h-4 w-px bg-stone-200" />

        <ControlButton onClick={onFitToScreen} title="Fit to Screen">
          <ArrowsIn size={16} />
        </ControlButton>

        <ControlButton onClick={onToggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <ArrowsOut size={16} /> : <CornersOut size={16} />}
        </ControlButton>

        {onShare && (
          <>
            <div className="mx-0.5 h-4 w-px bg-stone-200" />
            <ControlButton onClick={onShare} title="Share bracket">
              <Share size={16} />
            </ControlButton>
          </>
        )}
      </div>
    </div>
  )
}

function ControlButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center justify-center rounded-md p-1.5',
        'text-stone-500 hover:text-stone-800 hover:bg-stone-100',
        'transition-colors duration-150'
      )}
    >
      {children}
    </button>
  )
}
