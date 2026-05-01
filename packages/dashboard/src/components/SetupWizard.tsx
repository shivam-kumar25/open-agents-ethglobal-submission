import { useState } from 'react'

interface CapabilityStatus {
  label: string
  envVars: string[]
  getItAt: string
  description: string
  impact: string
  present: boolean
}

interface SetupWizardProps {
  onDismiss: () => void
}

// Dashboard reads these from Vite env (must be prefixed VITE_)
function checkEnv(key: string): boolean {
  return !!(import.meta.env[`VITE_${key}`] as string | undefined)
}

export function SetupWizard({ onDismiss }: SetupWizardProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const capabilities: CapabilityStatus[] = [
    {
      label: 'AXL P2P Keys',
      envVars: ['(generated locally)'],
      getItAt: 'bash scripts/setup/01-generate-axl-keys.sh',
      description: 'Ed25519 identity keys for each agent to connect to the AXL mesh.',
      impact: 'Without this, agents cannot communicate with each other at all.',
      present: true,
    },
    {
      label: 'Sepolia RPC (ENS Discovery)',
      envVars: ['SEPOLIA_RPC_URL'],
      getItAt: 'https://dashboard.alchemy.com (free tier)',
      description: 'An Ethereum Sepolia RPC endpoint so agents can look each other up by ENS name.',
      impact: 'Without this, agents cannot find each other by name (like researcher.neuralmesh.eth).',
      present: checkEnv('SEPOLIA_RPC_URL'),
    },
    {
      label: '0G Compute (AI Inference)',
      envVars: ['ZG_SERVICE_URL', 'ZG_COMPUTE_API_KEY'],
      getItAt: 'https://compute-marketplace.0g.ai',
      description: 'The 0G decentralized AI compute network. Agents use this to think.',
      impact: 'Without this, agents cannot process queries — they return "inference unavailable".',
      present: checkEnv('ZG_SERVICE_URL') && checkEnv('ZG_COMPUTE_API_KEY'),
    },
    {
      label: '0G Storage (Agent Memory)',
      envVars: ['ZG_STORAGE_NODE_URL', 'ZG_STORAGE_KV_NODE_URL'],
      getItAt: 'https://0g.ai/storage (two different endpoints needed)',
      description: 'Decentralized storage for agent state, conversation history, and training data.',
      impact: 'Without this, agent memory is lost when the process restarts.',
      present: checkEnv('ZG_STORAGE_NODE_URL') && checkEnv('ZG_STORAGE_KV_NODE_URL'),
    },
    {
      label: 'KeeperHub (Blockchain Execution)',
      envVars: ['KEEPERHUB_API_KEY'],
      getItAt: 'https://app.keeperhub.com/settings/api',
      description: 'KeeperHub runs automated blockchain workflows on behalf of agents.',
      impact: 'Without this, agents cannot execute blockchain actions or make micropayments.',
      present: checkEnv('KEEPERHUB_API_KEY'),
    },
    {
      label: 'Private Key (Wallet + iNFT)',
      envVars: ['PRIVATE_KEY', 'ZG_RPC_URL'],
      getItAt: 'Create a new wallet + get testnet tokens at https://faucet.0g.ai',
      description: 'An EVM private key for the agent wallet. Used for iNFT identity and USDC payments.',
      impact: 'Without this, agents have no on-chain identity and cannot earn or pay USDC.',
      present: checkEnv('PRIVATE_KEY') && checkEnv('ZG_RPC_URL'),
    },
  ]

  const presentCount = capabilities.filter((c) => c.present).length
  const allReady = presentCount === capabilities.length

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">Welcome to NeuralMesh!</h1>
          <p className="text-gray-400 text-sm mt-1">
            Let's check what's set up. You can run agents with just a few of these —
            others unlock more features.
          </p>
          <div className="mt-3 bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {capabilities.map((c, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm ${c.present ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    title={c.label}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-300">
                {presentCount}/{capabilities.length} capabilities ready
              </span>
              {allReady && (
                <span className="text-emerald-400 text-sm font-medium">All set!</span>
              )}
            </div>
          </div>
        </div>

        {/* Capability list */}
        <div className="p-4 space-y-2">
          {capabilities.map((cap, i) => (
            <div
              key={i}
              className={`rounded-lg border ${cap.present ? 'border-emerald-800 bg-emerald-950/30' : 'border-gray-700 bg-gray-800/50'}`}
            >
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className={`text-lg ${cap.present ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {cap.present ? '✓' : '○'}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{cap.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {cap.present ? 'Ready' : `Missing: ${cap.envVars.join(', ')}`}
                  </div>
                </div>
                <span className="text-gray-600 text-sm">{expanded === i ? '▲' : '▼'}</span>
              </button>

              {expanded === i && (
                <div className="px-4 pb-4 space-y-2 text-sm">
                  <p className="text-gray-300">{cap.description}</p>
                  <div className="bg-gray-900 rounded p-3 space-y-1">
                    <div className="text-xs text-gray-500 font-semibold uppercase">Impact if missing</div>
                    <p className="text-amber-300 text-xs">{cap.impact}</p>
                  </div>
                  {!cap.present && (
                    <div className="bg-gray-900 rounded p-3 space-y-2">
                      <div className="text-xs text-gray-500 font-semibold uppercase">How to set up</div>
                      <p className="text-emerald-400 text-xs">1. Get it: {cap.getItAt}</p>
                      <p className="text-emerald-400 text-xs">
                        2. Add to .env: {cap.envVars.map((v) => `${v}=your_value`).join('\n')}
                      </p>
                      <p className="text-emerald-400 text-xs">3. Restart agents</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Agents run in degraded mode if some keys are missing — they'll tell you exactly what's unavailable.
          </p>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded transition-colors"
          >
            {allReady ? 'Start Using NeuralMesh →' : 'Continue Anyway →'}
          </button>
        </div>
      </div>
    </div>
  )
}
