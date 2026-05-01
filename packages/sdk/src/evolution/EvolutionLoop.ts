import type { TrainingBuffer } from '../memory/TrainingBuffer.js'
import type { FineTuner } from '../intelligence/FineTuner.js'
import type { LoRAManager } from '../intelligence/LoRAManager.js'
import type { ENSResolver } from '../discovery/ENSResolver.js'
import type { iNFTClient } from '../identity/iNFT.js'
import type { GossipSub } from '../mesh/GossipSub.js'
import type { KeeperHub } from '../execution/KeeperHub.js'

export interface EvolutionConfig {
  agentName: string
  threshold: number
  trainingBuffer: TrainingBuffer
  fineTuner: FineTuner
  loraManager: LoRAManager
  ens: ENSResolver
  inft: iNFTClient
  gossip: GossipSub
  keeperhub: KeeperHub
  inftTokenId: number
  signerKey: string
  zgFinetuneProvider: string
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
    console.log(`[EvolutionLoop] ${this.config.agentName}: ${count}/${this.config.threshold} training examples`)

    if (count < this.config.threshold) return

    console.log(`[EvolutionLoop] Threshold reached! Starting evolution for ${this.config.agentName}`)

    // 1. Flush training buffer → upload JSONL → get 0G root hash
    const datasetRoot = await this.config.trainingBuffer.flush()
    if (!datasetRoot) {
      console.error('[EvolutionLoop] Failed to upload training dataset')
      return
    }
    console.log(`[EvolutionLoop] Dataset uploaded: ${datasetRoot}`)

    // 2. Trigger via KeeperHub (audit trail + MEV protection)
    try {
      await this.config.keeperhub.triggerEvolution(this.config.agentName, datasetRoot)
    } catch (e) {
      console.warn('[EvolutionLoop] KeeperHub trigger failed, continuing direct:', e)
    }

    // 3. Run 0G fine-tuning (all 9 states + 48h acknowledge)
    // Init → SettingUp → SetUp → Training → Trained → Delivering → Delivered
    // → [acknowledge within 48h!] → UserAcknowledged → Finished
    const { loraRoot, jobId } = await this.config.fineTuner.runToCompletion({
      baseModel: 'Qwen2.5-0.5B-Instruct',
      datasetRoot,
      onStatusChange: (status) => {
        console.log(`[EvolutionLoop] Fine-tuning status: ${status}`)
      },
    })

    // 4. Store LoRA and update iNFT metadataHash
    const currentHash = await this.config.inft.getMetadataHash(this.config.inftTokenId)
    const newMetadata = {
      agentName: this.config.agentName,
      loraRoot,
      jobId,
      prevHash: currentHash,
      timestamp: Date.now(),
    }
    const txHash = await this.config.loraManager.updateiNFT(
      this.config.inftTokenId,
      loraRoot,
      newMetadata,
    )
    console.log(`[EvolutionLoop] iNFT updated. Tx: ${txHash}`)

    // 5. Bump ENS neural-version text record
    const current = await this.config.ens.getText(this.config.agentName, 'neural-version')
    const next = bumpVersion(current ?? 'v1.0.0')
    await this.config.ens.setText(this.config.agentName, 'neural-version', next, this.config.signerKey)
    console.log(`[EvolutionLoop] ENS neural-version bumped: ${current} → ${next}`)

    // 6. Broadcast evolution complete via GossipSub
    await this.config.gossip.publish('evolution-complete', {
      agentName: this.config.agentName,
      fromVersion: current ?? 'v1.0.0',
      toVersion: next,
      loraRoot,
      inftTokenId: this.config.inftTokenId,
      timestamp: Date.now(),
    })

    // 7. Reset training buffer
    await this.config.trainingBuffer.reset()
    console.log(`[EvolutionLoop] Evolution complete. New version: ${next}`)
  }
}

function bumpVersion(version: string): string {
  const match = version.match(/^v(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return 'v1.1.0'
  const [, major, minor, patch] = match
  return `v${major}.${minor}.${String(parseInt(patch!, 10) + 1)}`
}
