const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws"

type EventHandler = (data: any) => void

interface WSMessage {
  type: string
  [key: string]: unknown
}

export class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<EventHandler>>()
  private reconnectAttempts = 0
  private maxReconnectDelay = 30000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private destroyed = false

  connect(): void {
    if (this.destroyed) return
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return
    this.close()

    try {
      this.ws = new WebSocket(WS_URL)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.emit("open", {})
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        this.emit(msg.type, msg)
        this.emit("message", msg)
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      this.emit("close", {})
      if (!this.destroyed) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.emit("error", {})
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  destroy(): void {
    this.destroyed = true
    this.close()
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.handlers.clear()
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach((h) => h(data))
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelay)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" })
    }, 20000)
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}

export const wsClient = new WSClient()
