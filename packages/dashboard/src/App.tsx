import { useState, useEffect } from 'react'
import { useAXLTopology } from './hooks/useAXLTopology.js'
import { useENSRecords } from './hooks/useENSRecords.js'
import { use0GStorage } from './hooks/use0GStorage.js'
import { AgentCard } from './components/AgentCard.js'
import { MeshTopology } from './components/MeshTopology.js'
import { EvolutionProgress } from './components/EvolutionProgress.js'
import { TaskSubmit } from './components/TaskSubmit.js'
import { SetupWizard } from './components/SetupWizard.js'
import { AGENTS } from './config.js'

// Show the setup wizard on first visit if agents appear offline
const WIZARD_DISMISSED_KEY = 'neuralmesh_wizard_dismissed'

export function App() {
  const { agents: topology, edges, loading: topoLoading } = useAXLTopology(5000)
  const { agents: ensData, lastUpdated } = useENSRecords(30000)
  const { agents: kvData } = use0GStorage(10000)

  const [showWizard, setShowWizard] = useState(false)

  const onlineCount = topology.filter((a) => a.online).length

  // Show setup wizard if no agents are online and user hasn't dismissed it before
  useEffect(() => {
    if (!topoLoading && onlineCount === 0) {
      const dismissed = localStorage.getItem(WIZARD_DISMISSED_KEY)
      if (!dismissed) setShowWizard(true)
    }
  }, [topoLoading, onlineCount])

  function dismissWizard() {
    localStorage.setItem(WIZARD_DISMISSED_KEY, '1')
    setShowWizard(false)
  }

  // Merge all data sources for each agent
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

  const planner = agentData.find((a) => a.name === 'planner')!
  const researcher = agentData.find((a) => a.name === 'researcher')!

  const totalEarnings = agentData
    .reduce((s, a) => s + parseFloat(a.earnings || '0'), 0)
    .toFixed(2)

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Setup wizard overlay */}
      {showWizard && <SetupWizard onDismiss={dismissWizard} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">NeuralMesh</h1>
          <p className="text-xs text-gray-500">Self-evolving decentralized AI agent economy</p>
        </div>
        <div className="flex items-center gap-6">
          {/* Online indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
              }`}
            />
            <span className="text-sm text-gray-300">
              {topoLoading
                ? 'Connecting to mesh...'
                : `${onlineCount}/5 agents online`}
            </span>
          </div>

          {/* Economy counter */}
          <div className="text-xs text-gray-500">
            Economy:{' '}
            <span className="text-emerald-400 font-mono font-bold">${totalEarnings} USDC</span>
          </div>

          {/* ENS last sync */}
          {lastUpdated && (
            <span className="text-xs text-gray-600">
              ENS synced {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}

          {/* Setup button */}
          <button
            onClick={() => setShowWizard(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Setup guide
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <main className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-56px)]">

        {/* Column 1: Agent cards (3 cols) */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agents</h2>
            <span className="text-xs text-gray-600">
              {onlineCount > 0 ? `${onlineCount} online` : 'all offline'}
            </span>
          </div>

          {agentData.map((a) => (
            <AgentCard key={a.name} {...a} />
          ))}

          {/* Tip when offline */}
          {!topoLoading && onlineCount === 0 && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-300 space-y-1">
              <p className="font-semibold">Agents are offline.</p>
              <p>Start them with:</p>
              <code className="block bg-black/40 rounded p-1.5 text-amber-400">
                bash scripts/demo/run-all-agents.sh
              </code>
            </div>
          )}
        </div>

        {/* Column 2: Mesh topology + Task submit (5 cols) */}
        <div className="col-span-5 flex flex-col gap-3">
          {/* Task submission */}
          <TaskSubmit
            plannerPubkey={planner.axlPubkey}
            plannerOnline={planner.online}
          />

          {/* Mesh topology */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Mesh Topology — AXL P2P (encrypted, no central server)
            </h2>
            <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900">
              <MeshTopology agents={topology} edges={edges} />
            </div>
          </div>
        </div>

        {/* Column 3: Evolution + Stats (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 overflow-y-auto">

          {/* Evolution panel */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Evolution — researcher.neuralmesh.eth
            </h2>
            <EvolutionProgress
              trainingExamples={researcher.trainingExamples}
              lastEvolutionTimestamp={researcher.lastEvolutionTimestamp}
              loraRoot={researcher.loraRoot}
              currentVersion={researcher.version}
            />
          </div>

          {/* Mesh stats */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              Network Stats
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Stat label="Total tasks" value={agentData.reduce((s, a) => s + a.taskCount, 0).toString()} />
              <Stat label="Avg reputation" value={`${Math.round(agentData.reduce((s, a) => s + a.reputation, 0) / agentData.length)}%`} color="text-emerald-400" />
              <Stat label="Researcher ver" value={researcher.version} color="text-purple-400" />
              <Stat label="LoRA stored" value={researcher.loraRoot ? '✓ Yes' : 'Not yet'} />
            </div>
          </div>

          {/* Contracts */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              Deployed Contracts
            </h3>
            <div className="space-y-2 text-xs">
              <ContractLink
                label="NeuralMesh Registry"
                network="0G Galileo"
                envKey="VITE_REGISTRY_ADDRESS"
                scanUrl="https://chainscan-galileo.0g.ai"
              />
              <ContractLink
                label="NeuralMesh Resolver"
                network="ENS Sepolia"
                envKey="VITE_RESOLVER_ADDRESS"
                scanUrl="https://sepolia.etherscan.io"
              />
              <ContractLink
                label="ERC-7857 iNFT"
                network="0G Galileo"
                address="0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F"
                scanUrl="https://chainscan-galileo.0g.ai"
              />
            </div>
          </div>

          {/* How this works — helpful explanation */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              How It Works
            </h3>
            <div className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
              <p>1. You type a question in the task box above</p>
              <p>2. The planner agent receives it over AXL (encrypted P2P)</p>
              <p>3. Planner finds the researcher via ENS name resolution</p>
              <p>4. Researcher thinks using 0G's decentralized AI</p>
              <p>5. Evaluator scores the answer and updates reputation</p>
              <p>6. When 50 tasks are done, researcher fine-tunes itself!</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

// Small helper components
function Stat({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className={`font-mono font-bold text-lg ${color}`}>{value}</div>
    </div>
  )
}

function ContractLink({
  label, network, address, envKey, scanUrl,
}: {
  label: string
  network: string
  address?: string
  envKey?: string
  scanUrl: string
}) {
  const resolved = address ?? (envKey ? (import.meta.env[envKey] as string | undefined) : undefined)
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white">{label}</div>
        <div className="text-gray-600">{network}</div>
      </div>
      {resolved ? (
        <a
          href={`${scanUrl}/address/${resolved}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-500 hover:text-emerald-400 font-mono"
        >
          {resolved.slice(0, 6)}...{resolved.slice(-4)} ↗
        </a>
      ) : (
        <span className="text-gray-600">not deployed</span>
      )}
    </div>
  )
}
