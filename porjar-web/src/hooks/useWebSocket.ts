'use client'

import { useEffect, useRef, useCallback } from 'react'
import { WebSocketClient, getLiveScoreClient } from '@/lib/ws'
import type { WSMessage, WSMessageType } from '@/types'

interface UseWebSocketOptions {
  channels?: string[]
  onMessage?: (msg: WSMessage) => void
  messageTypes?: WSMessageType[]
  autoConnect?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { channels = [], onMessage, messageTypes, autoConnect = true } = options
  const clientRef = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    if (!autoConnect) return

    const client = getLiveScoreClient()
    clientRef.current = client
    client.connect()

    // Subscribe to channels
    channels.forEach((ch) => client.subscribe(ch))

    // Setup message handlers
    const cleanups: (() => void)[] = []

    if (onMessage) {
      if (messageTypes && messageTypes.length > 0) {
        messageTypes.forEach((type) => {
          const cleanup = client.on(type, onMessage)
          cleanups.push(cleanup)
        })
      } else {
        const cleanup = client.on('*', onMessage)
        cleanups.push(cleanup)
      }
    }

    return () => {
      channels.forEach((ch) => client.unsubscribe(ch))
      cleanups.forEach((cleanup) => cleanup())
      client.disconnect()
    }
  }, [autoConnect, channels.join(','), messageTypes?.join(',')])

  const subscribe = useCallback((channel: string) => {
    clientRef.current?.subscribe(channel)
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    clientRef.current?.unsubscribe(channel)
  }, [])

  return { subscribe, unsubscribe, client: clientRef.current }
}
