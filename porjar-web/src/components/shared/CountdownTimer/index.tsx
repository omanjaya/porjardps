'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  targetDate: Date | string
  onComplete?: () => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
}

function getTimeRemaining(target: Date): number {
  return Math.max(0, target.getTime() - Date.now())
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':')
}

export function CountdownTimer({
  targetDate,
  onComplete,
  label,
  size = 'md',
}: CountdownTimerProps) {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const initialRemaining = getTimeRemaining(target)
  const [remaining, setRemaining] = useState(() => initialRemaining)
  const [completed, setCompleted] = useState(() => initialRemaining <= 0)

  const handleComplete = useCallback(() => {
    setCompleted(true)
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    if (completed) return

    const tick = () => {
      const ms = getTimeRemaining(target)
      setRemaining(ms)
      if (ms <= 0) {
        handleComplete()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target, completed, handleComplete])

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-sm font-medium text-stone-500">{label}</span>
      )}
      <span
        className={cn(
          'font-mono font-bold tabular-nums tracking-wider text-stone-900',
          sizeClasses[size]
        )}
      >
        {completed ? (
        <span className="text-sm font-semibold text-green-600">● Sudah Dimulai</span>
      ) : (
        formatTime(remaining)
      )}
      </span>
    </div>
  )
}
