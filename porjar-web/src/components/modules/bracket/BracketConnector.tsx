'use client'

interface ConnectorProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  isWinnerPath?: boolean
  isLivePath?: boolean
  isLoserPath?: boolean
  routeY?: number // Intermediate Y for loser drop paths (go down first, then right)
}

export function BracketConnector({
  fromX,
  fromY,
  toX,
  toY,
  isWinnerPath = false,
  isLivePath = false,
  isLoserPath = false,
  routeY,
}: ConnectorProps) {
  // Siku-siku (right-angle) connector: horizontal → vertical → horizontal
  // For loser drop paths (routeY provided): vertical → horizontal → vertical → horizontal
  // This avoids the loser drop line crossing through winners bracket match boxes.
  const ELBOW = 25
  const elbowX = toX - ELBOW

  const d = routeY != null
    ? `M ${fromX} ${fromY} V ${routeY} H ${elbowX} V ${toY} H ${toX}`
    : `M ${fromX} ${fromY} H ${elbowX} V ${toY} H ${toX}`

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
