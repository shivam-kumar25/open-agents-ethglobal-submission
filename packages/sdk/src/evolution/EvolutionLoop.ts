import type { TrainingBuffer } from '../memory/TrainingBuffer.js'
import type { ENSResolver } from '../discovery/ENSResolver.js'
import type { GossipSub } from '../mesh/GossipSub.js'
import type { KeeperHub } from '../execution/KeeperHub.js'

export interface EvolutionConfig {
  agentName: string
  threshold: number
  trainingBuffer: TrainingBuffer
  ens: ENSResolver
  gossip: GossipSub
  keeperhub: KeeperHub
  signerKey: string
}

export class EvolutionLoop {
  private running = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private config: EvolutionConfig) {}

  start(): void {
    this.running = true
    this.scheduleNext()
    console.log(`[EvolutionLoop] Started for ${this.config.agentName}. Threshold: ${this.config.threshold} tasks`)
  }

  stop(): void {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
  }

  private scheduleNext(): void {
    if (!this.running) return
    this.timer = setTimeout(async () => {
      try { await this.runEvolutionCheck() } catch (e) { console.error('[EvolutionLoop] Check failed:', e) }
      this.scheduleNext()
    }, 60_000)
  }

  private async runEvolutionCheck(): Promise<void> {
    const count = this.config.trainingBuffer.getCount()
    console.log(`[EvolutionLoop] ${this.config.agentName}: ${count}/${this.config.threshold} tasks`)

    if (count < this.config.threshold) return

    console.log(`[EvolutionLoop] Threshold reached! Running evolution for ${this.config.agentName}`)

    // Notify KeeperHub — it orchestrates the evolution workflow
    try {
      await this.config.keeperhub.triggerEvolution(this.config.agentName, String(count))
    } catch (e) {
      console.warn('[EvolutionLoop] KeeperHub trigger failed:', e)
    }

    // Bump ENS neural-version text record
    let current: string | null = null
    try {
      current = await this.config.ens.getText(this.config.agentName, 'neural-version')
    } catch { /* not yet set */ }

    const next = bumpVersion(current ?? 'v1.0.0')

    try {
      await this.config.ens.setText(this.config.agentName, 'neural-version', next, this.config.signerKey)
      console.log(`[EvolutionLoop] ENS neural-version: ${current ?? 'v1.0.0'} → ${next}`)
    } catch (e) {
      console.warn('[EvolutionLoop] ENS setText failed (PRIVATE_KEY or SEPOLIA_RPC_URL not set):', e)
    }

    // Broadcast to mesh
    await this.config.gossip.publish('evolution-complete', {
      agentName: this.config.agentName,
      fromVersion: current ?? 'v1.0.0',
      toVersion: next,
      taskCount: count,
      timestamp: Date.now(),
    })

    this.config.trainingBuffer.reset()
    console.log(`[EvolutionLoop] Evolution complete. New version: ${next}`)
  }
}

function bumpVersion(version: string): string {
  const match = version.match(/^v(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return 'v1.1.0'
  const [, major, minor, patch] = match
  return `v${major}.${minor}.${String(parseInt(patch!, 10) + 1)}`
}
