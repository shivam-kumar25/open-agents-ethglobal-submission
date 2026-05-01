import type { NeuralMeshConfig, AgentHandle, ServiceHandler } from './AgentConfig.js'
import type { AgentState } from './AgentState.js'
import type { ENSResolver } from '../discovery/ENSResolver.js'
import type { AXLClient } from '../mesh/AXLClient.js'
import type { GossipSub } from '../mesh/GossipSub.js'
import type { KVStore } from '../memory/KVStore.js'
import type { LogStore } from '../memory/LogStore.js'
import type { TrainingBuffer } from '../memory/TrainingBuffer.js'
import type { Compute } from '../intelligence/Compute.js'
import type { FineTuner } from '../intelligence/FineTuner.js'
import type { KeeperHub } from '../execution/KeeperHub.js'
import type { AgenticWallet } from '../execution/AgenticWallet.js'
import type { iNFTClient } from '../identity/iNFT.js'
import type { EvolutionLoop } from '../evolution/EvolutionLoop.js'

export interface AgentDeps {
  ens: ENSResolver
  axl: AXLClient
  gossip: GossipSub
  kv: KVStore
  log: LogStore
  trainingBuffer: TrainingBuffer
  compute: Compute
  fineTuner: FineTuner
  keeperhub: KeeperHub
  wallet: AgenticWallet
  inft: iNFTClient
  evolution: EvolutionLoop | null
}

export class Agent {
  private services = new Map<string, ServiceHandler>()

  constructor(
    private config: NeuralMeshConfig,
    private state: AgentState,
    private deps: AgentDeps,
  ) {
    this.startMCPDispatch()
  }

  serve(service: string, handler: ServiceHandler): void {
    this.services.set(service, handler)
    console.log(`[${this.config.name}] Serving: ${service}`)
  }

  async find(ensName: string): Promise<AgentHandle> {
    const records = await this.deps.ens.resolve(ensName)
    if (!records.axlPubkey) throw new Error(`No axl-pubkey found for ${ensName}`)
    const axlPubkey = records.axlPubkey
    const axl = this.deps.axl
    return {
      name: ensName,
      pubkey: axlPubkey,
      async call(service, args) {
        return axl.mcpCall(axlPubkey, service, args)
      },
      async send(payload) {
        await axl.send(axlPubkey, payload)
      },
    }
  }

  async think(
    prompt: string,
    opts?: { model?: string; systemPrompt?: string },
  ): Promise<string> {
    return this.deps.compute.complete(prompt, {
      model: opts?.model ?? this.config.model,
      systemPrompt: opts?.systemPrompt,
    })
  }

  async remember(key: string, value: unknown): Promise<void> {
    await this.deps.kv.set(key, value)
  }

  async recall(key: string): Promise<unknown> {
    return this.deps.kv.get(key)
  }

  async log(category: string, data: unknown): Promise<void> {
    await this.deps.log.append(category, data)
    if (category === 'training' || category === 'tasks') {
      const example = data as { query?: string; result?: unknown }
      if (example.query && example.result) {
        await this.deps.trainingBuffer.add({
          messages: [
            { role: 'user', content: String(example.query) },
            { role: 'assistant', content: String(example.result) },
          ],
        })
      }
    }
  }

  async execute(action: {
    contract: string
    method: string
    args: unknown[]
    description: string
  }): Promise<string> {
    console.log(`[${this.config.name}] Executing onchain: ${action.description}`)
    const result = await this.deps.keeperhub.executeOnchain(action.contract, action.method, action.args)
    return result.txHash ?? ''
  }

  async broadcast(topic: string, data: unknown): Promise<void> {
    await this.deps.gossip.publish(topic, data)
  }

  async subscribe(topic: string, handler: (data: unknown, from: string) => void): Promise<void> {
    this.deps.gossip.subscribe(topic, handler)
  }

  getState(): AgentState {
    return { ...this.state }
  }

  async syncState(): Promise<void> {
    const records = await this.deps.ens.resolve(this.config.name)
    this.state.version = records.version
    this.state.reputation = records.reputation
    this.state.taskCount = records.tasks
    this.state.axlPubkey = records.axlPubkey
    const stored = await this.deps.kv.get('agent-state') as Partial<AgentState> | null
    if (stored) {
      this.state.earnings = stored.earnings ?? this.state.earnings
      this.state.trainingExamples = stored.trainingExamples ?? this.state.trainingExamples
      this.state.lastEvolution = stored.lastEvolution ?? this.state.lastEvolution
    }
  }

  async verifyAuthorization(tokenId: number, executor: string): Promise<boolean> {
    return this.deps.inft.isAuthorized(tokenId, executor)
  }

  private startMCPDispatch(): void {
    this.deps.axl.startRecvLoop(async (msg) => {
      const p = msg.payload as Record<string, unknown>
      if (p?.service && typeof p.service === 'string') {
        const handler = this.services.get(p.service)
        if (!handler) {
          await this.deps.axl.send(msg.src, {
            requestId: p.requestId,
            response: null,
            error: `Unknown service: ${p.service}`,
          })
          return
        }
        const taskId = String(p.requestId ?? `task-${Date.now()}`)
        try {
          const result = await handler(
            p.request as Record<string, unknown> ?? {},
            { from: msg.src, taskId },
          )
          await this.deps.axl.send(msg.src, { requestId: p.requestId, response: result })
          this.state.taskCount++
          await this.deps.kv.set('agent-state', this.state)
        } catch (err) {
          await this.deps.axl.send(msg.src, {
            requestId: p.requestId,
            response: null,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    })
  }
}
