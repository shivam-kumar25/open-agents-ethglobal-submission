import { useState } from 'react'
import { useAXLTopology } from './hooks/useAXLTopology.js'
import { useENSRecords } from './hooks/useENSRecords.js'
import { use0GStorage } from './hooks/use0GStorage.js'
import { AgentCard } from './components/AgentCard.js'
import { MeshTopology } from './components/MeshTopology.js'
import { EvolutionProgress } from './components/EvolutionProgress.js'
import { AGENTS } from './config.js'

export function App() {
  const { agents: topology, edges, loading: topoLoading } = useAXLTopology(5000)
  const { agents: ensData, lastUpdated } = useENSRecords(30000)
  const { agents: kvData } = use0GStorage(10000)
  const [sendingTask, setSendingTask] = useState(false)
  const [lastTaskResult, setLastTaskResult] = useState<string | null>(null)

  const onlineCount = topology.filter((a) => a.online).length

  // Merge data for each agent
  const agentData = AGENTS.map((a) => {
    const topo = topology.find((t) => t.name === a.name)
    const ens = ensData.find((e) => e.ensName === a.ensName)
    const kv = kvData.find((k) => k.name === a.name)
    return {
      name: a.name,
      ensName: a.ensName,
      evolves: a.evolves,
      online: topo?.online ?? false,
      version: ens?.version ?? 'v1.0.0',
      reputation: ens?.reputation ?? 100,
      taskCount: kv?.taskCount ?? ens?.taskCount ?? 0,
      trainingExamples: kv?.trainingExamples ?? 0,
      earnings: kv?.earnings ?? '0',
      inftTokenId: null as number | null,
      axlPubkey: topo?.pubkey ?? ens?.axlPubkey ?? '',
      loraRoot: kv?.loraRoot ?? null,
      lastEvolutionTimestamp: kv?.lastEvolutionTimestamp ?? null,
    }
  })

  const researcher = agentData.find((a) => a.name === 'researcher')!

  async function sendDemoTask() {
    setSendingTask(true)
    setLastTaskResult(null)
    try {
      const res = await fetch('/axl-planner/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dst: topology.find((a) => a.name === 'planner')?.pubkey ?? '',
          payload: btoa(JSON.stringify({
            service: 'plan',
            request: { query: 'What are the best USDC yield opportunities on DeFi right now?' },
            requestId: `demo-${Date.now()}`,
          })),
        }),
      })
      if (res.ok) setLastTaskResult('Task sent to planner. Watch the task feed for results.')
      else setLastTaskResult(`Failed: ${res.status}`)
    } catch (e) {
      setLastTaskResult(`Error: ${e}`)
    } finally {
      setSendingTask(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">NeuralMesh</h1>
          <p className="text-xs text-gray-500">The internet for AI agents</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm text-gray-300">
              {topoLoading ? 'Connecting...' : `${onlineCount}/5 agents online`}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-600">
              ENS: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => void sendDemoTask()}
            disabled={sendingTask || onlineCount === 0}
            className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-white transition-colors"
          >
            {sendingTask ? 'Sending...' : 'Send Demo Task'}
          </button>
        </div>
      </header>

      {lastTaskResult && (
        <div className="px-6 py-2 bg-emerald-950 border-b border-emerald-900 text-xs text-emerald-300">
          {lastTaskResult}
        </div>
      )}

      <main className="grid grid-cols-12 gap-4 p-6 h-[calc(100vh-73px)]">
        {/* Left: Agent Cards */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agents</h2>
          {agentData.map((a) => (
            <AgentCard key={a.name} {...a} />
          ))}
        </div>

        {/* Center: Mesh Topology */}
        <div className="col-span-5 flex flex-col">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Mesh Topology — AXL P2P
          </h2>
          <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900">
            <MeshTopology agents={topology} edges={edges} />
          </div>
        </div>

        {/* Right: Evolution + Stats */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Evolution</h2>
          <EvolutionProgress
            trainingExamples={researcher.trainingExamples}
            lastEvolutionTimestamp={researcher.lastEvolutionTimestamp}
            loraRoot={researcher.loraRoot}
            currentVersion={researcher.version}
          />

          {/* Quick stats */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Network Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-500">Total tasks</div>
                <div className="text-white font-mono font-bold text-lg">
                  {agentData.reduce((s, a) => s + a.taskCount, 0)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Avg reputation</div>
                <div className="text-emerald-400 font-mono font-bold text-lg">
                  {Math.round(agentData.reduce((s, a) => s + a.reputation, 0) / agentData.length)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Researcher version</div>
                <div className="text-purple-400 font-mono">{researcher.version}</div>
              </div>
              <div>
                <div className="text-gray-500">LoRA stored</div>
                <div className="font-mono text-white">{researcher.loraRoot ? 'Yes ✓' : 'Not yet'}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
