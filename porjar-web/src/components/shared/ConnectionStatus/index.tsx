'use client'

import { useEffect, useState } from 'react'
import { WifiSlash } from '@phosphor-icons/react'
import { getLiveScoreClient } from '@/lib/ws'

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const client = getLiveScoreClient()

    const interval = setInterval(() => {
      setIsConnected(client.isConnected)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  if (isConnected) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-amber-600 px-4 py-1.5 text-xs font-medium text-amber-50">
      <WifiSlash size={14} weight="bold" />
      <span>Koneksi terputus, mencoba menghubungkan kembali...</span>
    </div>
  )
}
