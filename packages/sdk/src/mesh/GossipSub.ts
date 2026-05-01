import type { AXLClient } from './AXLClient.js'

type GossipHandler = (data: unknown, from: string) => void

export class GossipSub {
  private handlers = new Map<string, GossipHandler[]>()
  private subscribedTopics = new Set<string>()

  constructor(private axl: AXLClient, private selfPubkey: string) {}

  async publish(topic: string, data: unknown): Promise<void> {
    await this.axl.gossipPublish(topic, { from: this.selfPubkey, topic, data })
  }

  subscribe(topic: string, handler: GossipHandler): void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, [])
    this.handlers.get(topic)!.push(handler)
  }

  async start(): Promise<void> {
    for (const topic of this.handlers.keys()) {
      if (!this.subscribedTopics.has(topic)) {
        await this.axl.gossipSubscribe(topic)
        this.subscribedTopics.add(topic)
      }
    }
    this.axl.startRecvLoop((msg) => {
      const p = msg.payload as Record<string, unknown>
      if (p?.topic && typeof p.topic === 'string') {
        const handlers = this.handlers.get(p.topic as string)
        if (handlers) {
          const from = typeof p.from === 'string' ? p.from : msg.src
          for (const h of handlers) h(p.data, from)
        }
      }
    })
  }
}
