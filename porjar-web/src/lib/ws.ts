import type { WSMessage, WSMessageType } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'

const VALID_WS_TYPES: readonly string[] = [
  'score_update',
  'match_status',
  'match_complete',
  'bracket_advance',
  'br_result_update',
  'standings_update',
  'notification',
  'spectator_count',
  'prediction_update',
  'ping',
] as const

function isValidWSType(type: unknown): type is WSMessageType {
  return typeof type === 'string' && VALID_WS_TYPES.includes(type)
}

type MessageHandler = (msg: WSMessage) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private subscriptions: Set<string> = new Set()

  constructor(path: string = '/live-scores') {
    this.url = `${WS_URL}${path}`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      // Re-subscribe to channels after reconnect
      this.subscriptions.forEach((channel) => {
        this.send({ action: 'subscribe', channel })
      })
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (!msg || !isValidWSType(msg.type)) {
          console.warn('[WS] Received unknown message type:', msg?.type)
          return
        }
        const validMsg = msg as WSMessage
        this.emit(validMsg.type, validMsg)
        this.emit('*', validMsg) // wildcard handlers
      } catch {
        // Ignore non-JSON messages
      }
    }

    this.ws.onclose = () => {
      this.attemptReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0 // prevent reconnect
    this.ws?.close()
    this.ws = null
    this.handlers.clear()
    this.subscriptions.clear()
  }

  subscribe(channel: string): void {
    this.subscriptions.add(channel)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ action: 'subscribe', channel })
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ action: 'unsubscribe', channel })
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  private emit(type: string, msg: WSMessage): void {
    this.handlers.get(type)?.forEach((handler) => handler(msg))
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      this.connect()
    }, Math.min(delay, 30000))
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton instance for live scores
let liveScoreClient: WebSocketClient | null = null

export function getLiveScoreClient(): WebSocketClient {
  if (!liveScoreClient) {
    liveScoreClient = new WebSocketClient('/live-scores')
  }
  return liveScoreClient
}
