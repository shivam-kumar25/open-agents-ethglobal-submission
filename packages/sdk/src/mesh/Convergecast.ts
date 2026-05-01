import type { AXLClient } from './AXLClient.js'

export interface ConvergecastResult<T> {
  responses: Map<string, T>
  failed: string[]
  aggregated: T | null
}

export class Convergecast {
  constructor(private axl: AXLClient) {}

  async gather<T>(
    peers: string[],
    query: unknown,
    aggregator: (results: T[]) => T,
    timeoutMs = 15_000,
  ): Promise<ConvergecastResult<T>> {
    const requestId = `cc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const responses = new Map<string, T>()
    const failed: string[] = []

    // Send query to all peers simultaneously
    await Promise.allSettled(
      peers.map((p) => this.axl.send(p, { convergecast: true, requestId, query })),
    )

    const deadline = Date.now() + timeoutMs
    const pending = new Set(peers)

    while (pending.size > 0 && Date.now() < deadline) {
      const msg = await this.axl.recv(Math.max(0, deadline - Date.now()))
      if (!msg) break
      const p = msg.payload as Record<string, unknown>
      if (p?.requestId === requestId && p?.convergecastResponse !== undefined) {
        responses.set(msg.src, p.convergecastResponse as T)
        pending.delete(msg.src)
      }
    }

    for (const peer of pending) failed.push(peer)

    const values = Array.from(responses.values())
    const aggregated = values.length > 0 ? aggregator(values) : null

    return { responses, failed, aggregated }
  }
}
