import { Centrifuge, type Subscription } from 'centrifuge'
import type { WSMessage, WSMessageType } from '@/types'
import { getAccessToken } from '@/lib/api'

// NEXT_PUBLIC_WS_URL should point to the Centrifugo WebSocket endpoint.
// Dev (Docker):  ws://localhost:8001/connection/websocket
// Prod (Caddy):  wss://esidenpasar.com/ws/connection/websocket  (Caddy strips /ws, proxies to centrifugo:8001)
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/connection/websocket'

const VALID_WS_TYPES: readonly string[] = [
  'score_update',
  'match_status',
  'match_complete',
  'bracket_advance',
  'bracket_update',
  'br_result_update',
  'standings_update',
  'notification',
  'spectator_count',
  'prediction_update',
  'new_submission',
  'tournament_update',
  'team_update',
  'lobby_update',
  'game_score',
  'ping',
] as const

function isValidWSType(type: unknown): type is WSMessageType {
  return typeof type === 'string' && VALID_WS_TYPES.includes(type)
}

type MessageHandler = (msg: WSMessage) => void

export class WebSocketClient {
  private centrifuge: Centrifuge
  private subscriptions: Map<string, Subscription> = new Map()
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private retryCount = 0
  private maxRetries = 5
  private errorLogged = false
  private gaveUp = false

  constructor(url: string = WS_URL) {
    this.centrifuge = new Centrifuge(url, {
      getToken: async () => getAccessToken() ?? '',
      timeout: 10000,
      minReconnectDelay: 1000,
      maxReconnectDelay: 16000,
      maxServerPingDelay: 10000,
    })

    // Track disconnects to enforce retry limit with exponential backoff
    this.centrifuge.on('disconnected', (ctx) => {
      // Only count transport-level failures (not intentional disconnects)
      if (ctx.reason === 'transport closed') {
        this.retryCount++
        if (!this.errorLogged) {
          // connection failed, will retry automatically
          this.errorLogged = true
        }
        if (this.retryCount >= this.maxRetries) {
          this.gaveUp = true
          this.centrifuge.disconnect()
        }
      }
    })

    this.centrifuge.on('connected', () => {
      // Reset counters on successful connection
      this.retryCount = 0
      this.errorLogged = false
      this.gaveUp = false
    })

    // Suppress noisy transport errors after first log
    this.centrifuge.on('error', (ctx) => {
      if (!this.errorLogged) {
        // transport error, handled by reconnect logic
        this.errorLogged = true
      }
    })
  }

  connect(): void {
    // Don't reconnect if we already gave up
    if (this.gaveUp) return
    // centrifuge-js handles idempotency — safe to call multiple times
    this.centrifuge.connect()
  }

  disconnect(): void {
    this.centrifuge.disconnect()
    this.handlers.clear()
    this.retryCount = 0
    this.errorLogged = false
    this.gaveUp = false
  }

  subscribe(channel: string): void {
    if (this.subscriptions.has(channel)) return

    const sub = this.centrifuge.newSubscription(channel)

    sub.on('publication', (ctx) => {
      const msg = ctx.data as WSMessage
      if (!msg || !isValidWSType(msg.type)) {
        // unknown message type, ignored
        return
      }
      this.emit(msg.type, msg)
      this.emit('*', msg)
    })

    sub.subscribe()
    this.subscriptions.set(channel, sub)
  }

  unsubscribe(channel: string): void {
    const sub = this.subscriptions.get(channel)
    if (sub) {
      sub.unsubscribe()
      this.centrifuge.removeSubscription(sub)
      this.subscriptions.delete(channel)
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  private emit(type: string, msg: WSMessage): void {
    this.handlers.get(type)?.forEach((handler) => handler(msg))
  }

  get isConnected(): boolean {
    return this.centrifuge.state === 'connected'
  }
}

// Singleton instance for the shared live-scores connection
let liveScoreClient: WebSocketClient | null = null

export function getLiveScoreClient(): WebSocketClient {
  if (!liveScoreClient) {
    liveScoreClient = new WebSocketClient()
  }
  return liveScoreClient
}

// Destroy the singleton so the next call to getLiveScoreClient creates a fresh
// authenticated connection. Call this on logout.
export function resetWSClient(): void {
  if (liveScoreClient) {
    liveScoreClient.disconnect()
    liveScoreClient = null
  }
}
