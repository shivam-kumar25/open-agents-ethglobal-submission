import { useState, useEffect } from 'react'
import { AGENTS, ZG_STORAGE_KV_URL } from '../config.js'

export interface AgentKVState {
  name: string
  taskCount: number
  trainingExamples: number
  lastEvolutionTimestamp: number | null
  loraRoot: string | null
  earnings: string
}

async function fetchAgentKV(agentName: string): Promise<Partial<AgentKVState>> {
  if (!ZG_STORAGE_KV_URL) return {}
  try {
    const key = `neuralmesh:${agentName}:agent-state`
    const res = await fetch(`${ZG_STORAGE_KV_URL}/kv/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return {}
    return await res.json() as Partial<AgentKVState>
  } catch {
    return {}
  }
}

export function use0GStorage(refreshIntervalMs = 10000): { agents: AgentKVState[]; loading: boolean } {
  const [agents, setAgents] = useState<AgentKVState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetch_ = async () => {
      const results = await Promise.all(
        AGENTS.map(async (agent) => {
          const kv = await fetchAgentKV(agent.name)
          return {
            name: agent.name,
            taskCount: kv.taskCount ?? 0,
            trainingExamples: kv.trainingExamples ?? 0,
            lastEvolutionTimestamp: kv.lastEvolutionTimestamp ?? null,
            loraRoot: kv.loraRoot ?? null,
            earnings: kv.earnings ?? '0',
          }
        }),
      )
      if (!mounted) return
      setAgents(results)
      setLoading(false)
    }
    void fetch_()
    const interval = setInterval(() => { void fetch_() }, refreshIntervalMs)
    return () => { mounted = false; clearInterval(interval) }
  }, [refreshIntervalMs])

  return { agents, loading }
}
