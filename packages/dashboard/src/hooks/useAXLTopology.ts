import { useState, useEffect } from 'react'
import { AGENTS } from '../config.js'

export interface AgentOnlineStatus {
  name: string
  ensName: string
  pubkey: string
  online: boolean
  peerCount: number
  port: number
}

export interface TopologyEdge {
  source: string
  target: string
}

interface AXLTopologyResult {
  agents: AgentOnlineStatus[]
  edges: TopologyEdge[]
  loading: boolean
}

async function fetchAgentStatus(agent: (typeof AGENTS)[number]): Promise<AgentOnlineStatus> {
  try {
    const res = await fetch(`${agent.axlApiPath}/api/self`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) throw new Error('offline')
    const data = await res.json() as { pubkey?: string; address?: string }
    const peersRes = await fetch(`${agent.axlApiPath}/api/peers`, { signal: AbortSignal.timeout(3000) })
    const peersData = peersRes.ok ? await peersRes.json() as { peers?: unknown[] } : { peers: [] }
    return {
      name: agent.name,
      ensName: agent.ensName,
      pubkey: data.pubkey ?? '',
      online: true,
      peerCount: peersData.peers?.length ?? 0,
      port: agent.port,
    }
  } catch {
    return { name: agent.name, ensName: agent.ensName, pubkey: '', online: false, peerCount: 0, port: agent.port }
  }
}

export function useAXLTopology(refreshIntervalMs = 5000): AXLTopologyResult {
  const [agents, setAgents] = useState<AgentOnlineStatus[]>([])
  const [edges, setEdges] = useState<TopologyEdge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetch_ = async () => {
      const results = await Promise.all(AGENTS.map(fetchAgentStatus))
      if (!mounted) return
      setAgents(results)
      // Build edges from peer relationships (online agents are connected)
      const online = results.filter((a) => a.online)
      const newEdges: TopologyEdge[] = []
      for (let i = 0; i < online.length; i++) {
        for (let j = i + 1; j < online.length; j++) {
          newEdges.push({ source: online[i]!.name, target: online[j]!.name })
        }
      }
      setEdges(newEdges)
      setLoading(false)
    }
    void fetch_()
    const interval = setInterval(() => { void fetch_() }, refreshIntervalMs)
    return () => { mounted = false; clearInterval(interval) }
  }, [refreshIntervalMs])

  return { agents, edges, loading }
}
