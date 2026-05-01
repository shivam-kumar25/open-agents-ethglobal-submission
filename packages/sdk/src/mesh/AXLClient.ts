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
    const envelope = { service, request: args, requestId }
    await this.send(dstPubkey, envelope)
    // Wait for response matching requestId
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      const msg = await this.recv(5_000)
      if (!msg) continue
      const p = msg.payload as Record<string, unknown>
      if (p?.requestId === requestId && p?.response !== undefined) {
        if (p.error) throw new Error(String(p.error))
        return p.response
      }
    }
    throw new Error(`AXL MCP call to ${service} timed out`)
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

  startRecvLoop(handler: (msg: AXLMessage) => void): () => void {
    this.recvLoopRunning = true
    const loop = async () => {
      while (this.recvLoopRunning) {
        const msg = await this.recv(10_000)
        if (msg) {
          try { handler(msg) } catch (e) { console.error('[AXL recv loop] handler error', e) }
        }
      }
    }
    void loop()
    return () => { this.recvLoopRunning = false }
  }
}
