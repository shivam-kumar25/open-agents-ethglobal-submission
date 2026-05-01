import type { Agent } from '@neuralmesh/sdk'
import { FineTuner, ENSResolver, iNFTClient, LoRAManager, LogStore, KeeperHub } from '@neuralmesh/sdk'
import type { EvolutionAnnouncement } from '../shared/types.js'
import { config } from './config.js'

export async function startEvolution(agent: Agent): Promise<void> {
  console.log('[evolution] Ready. Monitoring mesh for evolution triggers...')

  // Handle incoming evolution trigger requests
  agent.serve('trigger-evolution', async (args, meta) => {
    const agentName = String(args['agentName'] ?? 'researcher.neuralmesh.eth')
    const datasetRoot = String(args['datasetRoot'] ?? '')
    console.log(`[evolution] Evolution triggered for ${agentName}. Dataset: ${datasetRoot}`)

    if (!datasetRoot) return { success: false, error: 'No dataset root provided' }

    const fineTuner = new FineTuner({
      provider: process.env['ZG_FINETUNE_PROVIDER']!,
      privateKey: process.env['PRIVATE_KEY']!,
      zgRpcUrl: process.env['ZG_RPC_URL']!,
    })

    try {
      // Full lifecycle: Init → SettingUp → SetUp → Training → Trained → Delivering
      // → [CRITICAL: acknowledge within 48h] → UserAcknowledged → Finished
      const { loraRoot, jobId } = await fineTuner.runToCompletion({
        baseModel: 'Qwen2.5-0.5B-Instruct',
        datasetRoot,
        onStatusChange: (status) => {
          console.log(`[evolution] Fine-tuning ${agentName}: ${status}`)
          void agent.broadcast('finetune-status', { agentName, status, jobId: '' })
        },
      })
      console.log(`[evolution] Fine-tuning complete for ${agentName}. LoRA: ${loraRoot}`)

      // Announce upgrade via GossipSub
      const announcement: EvolutionAnnouncement = {
        agentName,
        fromVersion: 'v1.0.0',
        toVersion: 'v1.1.0',
        loraRoot,
        inftTokenId: 0,
        timestamp: Date.now(),
      }
      await agent.broadcast('evolution-complete', announcement)
      await agent.log('evolutions', { ...announcement, jobId })

      return { success: true, loraRoot, jobId }
    } catch (e) {
      console.error(`[evolution] Fine-tuning failed for ${agentName}:`, e)
      return { success: false, error: String(e) }
    }
  })

  // Subscribe to threshold-reached broadcasts from other agents
  await agent.subscribe('training-threshold-reached', async (data, from) => {
    const d = data as { agentName?: string; datasetRoot?: string }
    console.log(`[evolution] Threshold reached broadcast from ${from}:`, d)
    if (d.agentName && d.datasetRoot) {
      const agentHandle = await agent.find('evolution.neuralmesh.eth')
      void agentHandle.call('trigger-evolution', { agentName: d.agentName, datasetRoot: d.datasetRoot })
    }
  })

  // Periodic health check of all mesh agents (Convergecast pattern)
  setInterval(async () => {
    try {
      const agents = ['planner', 'researcher', 'executor', 'evaluator']
      const statuses: Record<string, boolean> = {}
      for (const a of agents) {
        try {
          const handle = await agent.find(`${a}.neuralmesh.eth`)
          await handle.send({ ping: true })
          statuses[a] = true
        } catch {
          statuses[a] = false
          console.warn(`[evolution] Agent ${a} is offline`)
        }
      }
      await agent.log('health', { statuses, timestamp: Date.now() })
      await agent.broadcast('health-status', { statuses, reporter: config.ensName, timestamp: Date.now() })
    } catch (e) {
      console.error('[evolution] Health check failed:', e)
    }
  }, 5 * 60 * 1000)

  console.log('[evolution] Evolution monitor active.')
  await new Promise(() => {})
}
