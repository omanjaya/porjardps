'use client'

import { useEffect, useState, useRef } from 'react'
import { Eye } from '@phosphor-icons/react'
import { getLiveScoreClient } from '@/lib/ws'
import { api } from '@/lib/api'

interface SpectatorCountProps {
  matchId: string
}

export function SpectatorCount({ matchId }: SpectatorCountProps) {
  const [count, setCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const animationRef = useRef<number | null>(null)

  // Animated number transition
  useEffect(() => {
    const start = displayCount
    const end = count
    if (start === end) return

    const duration = 400 // ms
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)

      setDisplayCount(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [count]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch spectator count via REST API as fallback
  useEffect(() => {
    async function fetchCount() {
      try {
        const data = await api.get<{ count: number }>(`/matches/${matchId}/spectators`)
        setCount(data.count)
      } catch (err) {
        console.error('Gagal memuat jumlah penonton:', err)
      }
    }

    fetchCount()

    // Poll every 10 seconds as fallback
    const interval = setInterval(fetchCount, 10000)
    return () => clearInterval(interval)
  }, [matchId])

  // WebSocket for real-time updates
  useEffect(() => {
    const wsClient = getLiveScoreClient()
    wsClient.connect()
    wsClient.subscribe(`match:${matchId}`)

    const unsubscribe = wsClient.on('spectator_count', (msg) => {
      const data = msg.data as { count: number }
      if (data?.count !== undefined) {
        setCount(data.count)
      }
    })

    return () => {
      unsubscribe()
      wsClient.unsubscribe(`match:${matchId}`)
    }
  }, [matchId])

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-stone-200 px-3 py-1 text-sm text-stone-700">
      <Eye size={16} weight="fill" className="text-porjar-red" />
      <span className="tabular-nums font-medium">{displayCount}</span>
      <span className="text-stone-400">menonton</span>
    </div>
  )
}
