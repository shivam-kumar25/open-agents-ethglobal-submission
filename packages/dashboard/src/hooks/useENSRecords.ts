import { useState, useEffect } from 'react'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { getTextRecord } from '@ensdomains/ensjs/public'
import { AGENTS, SEPOLIA_RPC } from '../config.js'

// Single client instance — created once per module load, not per render cycle
const ensClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })

export interface AgentENSData {
  ensName: string
  version: string
  reputation: number | null
  axlPubkey: string
  services: string[]
  model: string
  taskCount: number
}

const ENS_KEYS = ['neural-version', 'neural-reputation', 'axl-pubkey', 'axl-services', 'neural-model', 'neural-tasks']

export function useENSRecords(refreshIntervalMs = 30000): { agents: AgentENSData[]; loading: boolean; lastUpdated: number | null } {
  const [agents, setAgents] = useState<AgentENSData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const fetch_ = async () => {
      const results = await Promise.all(
        AGENTS.map(async (agent) => {
          const records: Record<string, string> = {}
          await Promise.all(
            ENS_KEYS.map(async (key) => {
              try {
                const v = await getTextRecord(ensClient, { name: agent.ensName, key })
                if (v) records[key] = v
              } catch { /* skip */ }
            }),
          )
          return {
            ensName: agent.ensName,
            version: records['neural-version'] ?? 'v1.0.0',
            reputation: records['neural-reputation'] ? parseInt(records['neural-reputation'], 10) : null,
            axlPubkey: records['axl-pubkey'] ?? '',
            services: records['axl-services'] ? records['axl-services'].split(',').map((s) => s.trim()) : [],
            model: records['neural-model'] ?? '',
            taskCount: parseInt(records['neural-tasks'] ?? '0', 10),
          }
        }),
      )
      if (!mounted) return
      setAgents(results)
      setLoading(false)
      setLastUpdated(Date.now())
    }

    void fetch_()
    const interval = setInterval(() => { void fetch_() }, refreshIntervalMs)
    return () => { mounted = false; clearInterval(interval) }
  }, [refreshIntervalMs])

  return { agents, loading, lastUpdated }
}
