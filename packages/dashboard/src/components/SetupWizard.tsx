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
      label: 'TokenRouter (AI Inference)',
      envVars: ['TOKENROUTER_API_KEY'],
      getItAt: 'https://tokenrouter.com (sign up, create API key)',
      description: 'The TokenRouter AI gateway. Agents use this to answer questions via Llama-3.1 or other models.',
      impact: 'Without this, agents cannot process queries — they return "inference unavailable".',
      present: checkEnv('TOKENROUTER_API_KEY'),
    },
    {
      label: 'KeeperHub (Workflows + Payments)',
      envVars: ['KEEPERHUB_API_KEY'],
      getItAt: 'https://app.keeperhub.com/settings/api',
      description: 'KeeperHub runs automated workflows: health monitoring, evolution triggers, and x402 USDC micropayments between agents.',
      impact: 'Without this, agents cannot make micropayments or run automated workflows.',
      present: checkEnv('KEEPERHUB_API_KEY'),
    },
    {
      label: 'Private Key (Wallet + ENS Writes)',
      envVars: ['PRIVATE_KEY'],
      getItAt: 'Create a fresh wallet in MetaMask → Account Details → Export Private Key',
      description: 'An EVM private key for signing ENS text record updates (reputation scores, version bumps) and USDC payments.',
      impact: 'Without this, agents cannot write to ENS or sign payments. ENS reads still work.',
      present: checkEnv('PRIVATE_KEY'),
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
