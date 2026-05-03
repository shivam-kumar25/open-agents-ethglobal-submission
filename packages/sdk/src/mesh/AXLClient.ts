import { Buffer } from 'node:buffer'

export interface AXLMessage {
  src: string
  payload: unknown
}

export interface AXLSelfInfo {
  pubkey: string
  address: string
}

export interface AXLPeerInfo {
  pubkey: string
  address: string
  online: boolean
}

export interface AXLTopology {
  self: AXLSelfInfo
  peers: AXLPeerInfo[]
}

export class AXLClient {
  private readonly baseUrl: string
  private recvLoopRunning = false
  private recvHandlers: Array<(msg: AXLMessage) => void> = []
  // Pending mcpCall promises keyed by requestId — resolved by the shared recv loop.
  // This prevents mcpCall's old inline recv() from racing against startRecvLoop.
  private pendingRequests = new Map<string, (msg: AXLMessage) => void>()

  constructor(apiPort: number) {
    this.baseUrl = `http://127.0.0.1:${apiPort}`
  }

  async send(dstPubkey: string, payload: unknown): Promise<void> {
    const body = JSON.stringify({
      dst: dstPubkey,
      payload: Buffer.from(JSON.stringify(payload)).toString('base64'),
    })
    const res = await fetch(`${this.baseUrl}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) throw new Error(`AXL send failed: ${res.status} ${await res.text()}`)
  }

  async recv(timeoutMs = 30_000): Promise<AXLMessage | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}/api/recv`, { signal: controller.signal })
      if (!res.ok) return null
      const data = (await res.json()) as { src: string; payload: string }
      const payload = JSON.parse(Buffer.from(data.payload, 'base64').toString('utf8')) as unknown
      return { src: data.src, payload }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  async self(): Promise<AXLSelfInfo> {
    const res = await fetch(`${this.baseUrl}/api/self`)
    if (!res.ok) throw new Error(`AXL /api/self failed: ${res.status}`)
    return res.json() as Promise<AXLSelfInfo>
  }

  async peers(): Promise<AXLPeerInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/peers`)
    if (!res.ok) return []
    const data = await res.json() as { peers?: AXLPeerInfo[] }
    return data.peers ?? []
  }

  async topology(): Promise<AXLTopology> {
    const res = await fetch(`${this.baseUrl}/api/topology`)
    if (!res.ok) throw new Error(`AXL /api/topology failed: ${res.status}`)
    return res.json() as Promise<AXLTopology>
  }

  async mcpCall(dstPubkey: string, service: string, args: Record<string, unknown>): Promise<unknown> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await this.send(dstPubkey, { service, request: args, requestId })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`AXL MCP call to ${service} timed out`))
      }, 30_000)
      this.pendingRequests.set(requestId, (msg) => {
        clearTimeout(timer)
        this.pendingRequests.delete(requestId)
        const p = msg.payload as Record<string, unknown>
        if (p.error) reject(new Error(String(p.error)))
        else resolve(p.response)
      })
    })
  }

  async gossipPublish(topic: string, data: unknown): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/gossip/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        data: Buffer.from(JSON.stringify(data)).toString('base64'),
      }),
    })
    if (!res.ok) throw new Error(`AXL gossip publish failed: ${res.status}`)
  }

  async gossipSubscribe(topic: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/gossip/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
    if (!res.ok) throw new Error(`AXL gossip subscribe failed: ${res.status}`)
  }

  async addPeer(axlAddress: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/peers/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: axlAddress }),
    })
    if (!res.ok) throw new Error(`AXL add peer failed: ${res.status}`)
  }

  // Multiple callers (Agent MCP dispatch + GossipSub) share one recv loop.
  // Adding a second loop causes both to compete for the same messages.
  startRecvLoop(handler: (msg: AXLMessage) => void): () => void {
    this.recvHandlers.push(handler)
    if (!this.recvLoopRunning) {
      this.recvLoopRunning = true
      const loop = async () => {
        while (this.recvLoopRunning) {
          const msg = await this.recv(10_000)
          if (msg) {
            const p = msg.payload as Record<string, unknown>
            if (p?.requestId && !p?.service && this.pendingRequests.has(p.requestId as string)) {
              this.pendingRequests.get(p.requestId as string)!(msg)
              continue
            }
            for (const h of [...this.recvHandlers]) {
              try { h(msg) } catch (e) { console.error('[AXL recv loop] handler error', e) }
            }
          }
        }
      }
      void loop()
    }
    return () => {
      this.recvHandlers = this.recvHandlers.filter((h) => h !== handler)
      if (this.recvHandlers.length === 0) this.recvLoopRunning = false
    }
  }
}
