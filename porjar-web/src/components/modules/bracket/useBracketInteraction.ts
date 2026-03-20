import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

interface UseBracketInteractionOptions {
  contentWidth: number
  contentHeight: number
}

interface ViewState {
  zoom: number
  panX: number
  panY: number
}

type ViewAction =
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_ZOOM_FN'; fn: (prev: number) => number }
  | { type: 'SET_PAN'; panX: number; panY: number }
  | { type: 'SET_ALL'; zoom: number; panX: number; panY: number }
  | { type: 'LERP'; target: ViewState }

function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom }
    case 'SET_ZOOM_FN':
      return { ...state, zoom: action.fn(state.zoom) }
    case 'SET_PAN':
      return { ...state, panX: action.panX, panY: action.panY }
    case 'SET_ALL':
      return { zoom: action.zoom, panX: action.panX, panY: action.panY }
    case 'LERP': {
      const t = action.target
      let newZoom = state.zoom
      let newPanX = state.panX
      let newPanY = state.panY

      const zDiff = t.zoom - state.zoom
      newZoom = Math.abs(zDiff) < 0.002 ? t.zoom : state.zoom + zDiff * 0.6

      const xDiff = t.panX - state.panX
      newPanX = Math.abs(xDiff) < 1 ? t.panX : state.panX + xDiff * 0.6

      const yDiff = t.panY - state.panY
      newPanY = Math.abs(yDiff) < 1 ? t.panY : state.panY + yDiff * 0.6

      return { zoom: newZoom, panX: newPanX, panY: newPanY }
    }
    default:
      return state
  }
}

export function useBracketInteraction({ contentWidth, contentHeight }: UseBracketInteractionOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Consolidated zoom & pan state
  const [view, dispatchView] = useReducer(viewReducer, { zoom: 1, panX: 0, panY: 0 })
  const { zoom, panX, panY } = view

  // Keep a ref synced with current view for animation convergence checks
  const lastViewRef = useRef(view)
  lastViewRef.current = view

  // Expose a setZoom that accepts a value or updater function (like useState setter)
  const setZoom = useCallback((valOrFn: number | ((prev: number) => number)) => {
    if (typeof valOrFn === 'function') {
      dispatchView({ type: 'SET_ZOOM_FN', fn: valOrFn })
    } else {
      dispatchView({ type: 'SET_ZOOM', zoom: valOrFn })
    }
  }, [])

  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Smooth zoom & pan with requestAnimationFrame lerp
  const target = useRef({ zoom: 1, panX: 0, panY: 0 })
  const animFrame = useRef(0)

  // Sync target with current state on mount
  useEffect(() => {
    target.current = { zoom, panX, panY }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startAnimation = useCallback(() => {
    if (animFrame.current) return
    const tick = () => {
      const t = target.current
      dispatchView({ type: 'LERP', target: t })

      // Check if we're done by reading target vs dispatched lerp
      // We rely on the reducer to converge — schedule next frame and check convergence
      animFrame.current = requestAnimationFrame(() => {
        // Read current approximation from ref-synced values
        // Since we can't read state in rAF easily, we keep ticking until
        // target hasn't changed for a while. Use a simple heuristic:
        // We'll keep the previous approach but as a single dispatch.
        animFrame.current = 0
        // Check if target was already reached (approximate via ref)
        const cur = lastViewRef.current
        const tgt = target.current
        const zDone = Math.abs(tgt.zoom - cur.zoom) < 0.002
        const xDone = Math.abs(tgt.panX - cur.panX) < 1
        const yDone = Math.abs(tgt.panY - cur.panY) < 1
        if (!(zDone && xDone && yDone)) {
          startAnimation()
        }
      })
    }
    animFrame.current = requestAnimationFrame(tick)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }, [])

  // Soft clamp — allow some overscroll but keep content reachable
  const clampPan = useCallback(
    (px: number, py: number, z?: number) => {
      const currentZoom = z ?? zoom
      const scaledW = contentWidth * currentZoom
      const scaledH = contentHeight * currentZoom
      const vw = containerSize.width
      const vh = containerSize.height

      // Allow panning half a viewport beyond edges
      const overscroll = 100
      const minX = Math.min(overscroll, vw - scaledW - overscroll)
      const maxX = overscroll
      const minY = Math.min(overscroll, vh - scaledH - overscroll)
      const maxY = overscroll

      return {
        x: Math.max(minX, Math.min(maxX, px)),
        y: Math.max(minY, Math.min(maxY, py)),
      }
    },
    [zoom, contentWidth, contentHeight, containerSize]
  )

  // Fit to screen calculation
  const fitToScreen = useCallback(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return
    if (contentWidth <= 0 || contentHeight <= 0) return

    const isMobile = containerSize.width < 640
    // Fit to width — bracket is scrollable vertically, so don't constrain by height.
    // On mobile enforce a minimum readable zoom of 0.3.
    const scaleX = containerSize.width / contentWidth
    const minZoom = isMobile ? 0.3 : 0.1
    const newZoom = Math.max(minZoom, Math.min(1.5, scaleX * 0.9))
    const finalZoom = Math.max(minZoom, Math.min(3, newZoom))

    // Center horizontally if content fits, otherwise start at left edge
    const scaledW = contentWidth * finalZoom
    const newPanX = scaledW <= containerSize.width
      ? (containerSize.width - scaledW) / 2
      : 0

    // Pin content just below the round-header strip (~40px) instead of centering vertically.
    // This eliminates the large empty gap above the bracket cards.
    const ROUND_HEADER_HEIGHT = 40
    const newPanY = ROUND_HEADER_HEIGHT

    // Single batched update
    dispatchView({ type: 'SET_ALL', zoom: finalZoom, panX: newPanX, panY: newPanY })

    // Also update animation target
    target.current = { zoom: finalZoom, panX: newPanX, panY: newPanY }
  }, [containerSize, contentWidth, contentHeight])

  // Auto-fit on first render
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      fitToScreen()
    }
    // Re-fit when container or content dimensions change
  }, [containerSize.width, containerSize.height, contentWidth, contentHeight, fitToScreen])

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.pow(0.997, e.deltaY)
      const prev = target.current
      const next = Math.max(0.15, Math.min(3, prev.zoom * factor))
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const ratio = next / prev.zoom

      target.current = {
        zoom: next,
        panX: mx - ratio * (mx - prev.panX),
        panY: my - ratio * (my - prev.panY),
      }
      startAnimation()
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [startAnimation])

  // Pan: mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setIsPanning(true)
      setPanStart({ x: e.clientX - target.current.panX, y: e.clientY - target.current.panY })
    },
    []
  )

  // Pan: mouse move — smooth lerp
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      const clamped = clampPan(e.clientX - panStart.x, e.clientY - panStart.y)
      target.current = { ...target.current, panX: clamped.x, panY: clamped.y }
      startAnimation()
    },
    [isPanning, panStart, clampPan, startAnimation]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Touch: pinch zoom & single-finger pan
  const touchRef = useRef<{ dist: number; zoom: number; panX: number; panY: number; cx: number; cy: number } | null>(null)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const t = target.current
        touchRef.current = { dist, zoom: t.zoom, panX: t.panX, panY: t.panY, cx, cy }
      } else if (e.touches.length === 1) {
        setIsPanning(true)
        setPanStart({ x: e.touches[0].clientX - target.current.panX, y: e.touches[0].clientY - target.current.panY })
      }
    },
    []
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && touchRef.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const scale = dist / touchRef.current.dist
        const newZoom = Math.max(0.15, Math.min(3, touchRef.current.zoom * scale))

        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const cx = touchRef.current.cx - rect.left
          const cy = touchRef.current.cy - rect.top
          const s = newZoom / touchRef.current.zoom
          target.current = {
            zoom: newZoom,
            panX: cx - s * (cx - touchRef.current.panX),
            panY: cy - s * (cy - touchRef.current.panY),
          }
          startAnimation()
        }
      } else if (e.touches.length === 1 && isPanning) {
        const clamped = clampPan(e.touches[0].clientX - panStart.x, e.touches[0].clientY - panStart.y)
        target.current = { ...target.current, panX: clamped.x, panY: clamped.y }
        startAnimation()
      }
    },
    [isPanning, panStart, clampPan, startAnimation]
  )

  const handleTouchEnd = useCallback(() => {
    touchRef.current = null
    setIsPanning(false)
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Mini-map navigation
  const handleMiniMapNavigate = useCallback((newPanX: number, newPanY: number) => {
    const clamped = clampPan(newPanX, newPanY)
    dispatchView({ type: 'SET_PAN', panX: clamped.x, panY: clamped.y })
  }, [clampPan])

  return {
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
  }
}
