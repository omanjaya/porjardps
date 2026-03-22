'use client'

interface ConnectorProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  isWinnerPath?: boolean
  isLivePath?: boolean
  isLoserPath?: boolean
}

export function BracketConnector({
  fromX,
  fromY,
  toX,
  toY,
  isWinnerPath = false,
  isLivePath = false,
  isLoserPath = false,
}: ConnectorProps) {
  // Siku-siku (right-angle) connector: horizontal → vertical → horizontal
  // For loser drop paths: cubic bezier curve so each line has a unique arc
  // avoiding the parallel-lines problem of shared horizontal routing lanes.
  const ELBOW = 25
  const elbowX = toX - ELBOW

  let d: string
  if (isLoserPath) {
    const midX = (fromX + toX) / 2
    d = `M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`
  } else {
    d = `M ${fromX} ${fromY} H ${elbowX} V ${toY} H ${toX}`
  }

  const strokeColor = isLivePath
    ? '#ef4444'
    : isLoserPath
      ? '#f59e0b'
      : isWinnerPath
        ? '#22c55e'
        : '#a8a29e'

  const strokeWidth = isLivePath ? 2.5 : isWinnerPath ? 2 : isLoserPath ? 1.5 : 1.5
  const strokeDasharray = isLoserPath ? '6 4' : undefined
  const opacity = isLoserPath ? 0.7 : isWinnerPath || isLivePath ? 1 : 0.65

  return (
    <path
      d={d}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeLinejoin="round"
      opacity={opacity}
      className={isLivePath ? 'animate-pulse' : ''}
    />
  )
}
