import type { Agent } from '@neuralmesh/sdk'
import type { EvolutionAnnouncement } from '@neuralmesh/agent-shared'
import { config } from './config.js'

export async function startEvolution(agent: Agent): Promise<void> {
  console.log('[evolution] Ready. Monitoring mesh for evolution triggers...')

  // Handle incoming evolution trigger requests (called by KeeperHub workflow)
  agent.serve('trigger-evolution', async (args, _meta) => {
    const agentName = String(args['agentName'] ?? 'researcher.neuralmesh.eth')
    const taskCount = Number(args['taskCount'] ?? 0)
    console.log(`[evolution] Evolution triggered for ${agentName} at ${taskCount} tasks`)

    // Broadcast evolution-complete so all agents know about the version bump
    // (actual ENS version bump is handled by EvolutionLoop in the SDK)
    const announcement: EvolutionAnnouncement = {
      agentName,
      fromVersion: 'v1.0.0',
      toVersion: 'v1.1.0',
      timestamp: Date.now(),
    }
    await agent.broadcast('evolution-complete', announcement)
    agent.log('evolutions', { ...announcement, taskCount })

    return { success: true, agentName, taskCount }
  })

  // Subscribe to threshold-reached broadcasts from other agents
  agent.subscribe('training-threshold-reached', async (data, from) => {
    const d = data as { agentName?: string; taskCount?: number }
    console.log(`[evolution] Threshold reached broadcast from ${from}:`, d)
    if (d.agentName) {
      const handle = await agent.find('evolution.neuralmesh.eth')
      void handle.call('trigger-evolution', { agentName: d.agentName, taskCount: d.taskCount ?? 0 })
    }
  })

  // Periodic health check of all mesh agents
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
      agent.log('health', { statuses, timestamp: Date.now() })
      await agent.broadcast('health-status', { statuses, reporter: config.ensName, timestamp: Date.now() })
    } catch (e) {
      console.error('[evolution] Health check failed:', e)
    }
  }, 5 * 60 * 1000)

  console.log('[evolution] Evolution monitor active.')
  await new Promise(() => {})
}
