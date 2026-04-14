'use client'

import { useState, useEffect, useRef } from 'react'
import { WifiSlash, WifiHigh } from '@phosphor-icons/react'

type ConnectionState = 'online' | 'offline' | 'back-online'

export function OfflineIndicator() {
  const [state, setState] = useState<ConnectionState>('online')
  const wasOfflineRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Initialize — only show banner if already offline on mount
    if (!navigator.onLine) {
      setState('offline')
      wasOfflineRef.current = true
    }

    function handleOffline() {
      wasOfflineRef.current = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setState('offline')
    }

    function handleOnline() {
      if (!wasOfflineRef.current) return
      setState('back-online')
      timeoutRef.current = setTimeout(() => {
        setState('online')
        wasOfflineRef.current = false
      }, 2500)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (state === 'online') return null

  const isOffline = state === 'offline'

  return (
    <div
      className={`animate-in slide-in-from-top duration-500 fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
        isOffline
          ? 'bg-amber-500 text-white'
          : 'bg-green-500 text-white'
      }`}
    >
      {isOffline ? (
        <>
          <WifiSlash size={16} weight="bold" />
          <span>Kamu sedang offline — data mungkin tidak terbaru</span>
        </>
      ) : (
        <>
          <WifiHigh size={16} weight="bold" />
          <span>Kembali online!</span>
        </>
      )}
    </div>
  )
}
