import { ZG_EXPLORER, INFT_CONTRACT, ENS_APP, EVOLUTION_THRESHOLD } from '../config.js'

interface AgentCardProps {
  name: string
  ensName: string
  online: boolean
  version: string
  reputation: number
  taskCount: number
  trainingExamples: number
  earnings: string
  inftTokenId: number | null
  axlPubkey: string
  evolves: boolean
}

export function AgentCard({
  name, ensName, online, version, reputation, taskCount,
  trainingExamples, earnings, inftTokenId, axlPubkey, evolves,
}: AgentCardProps) {
  const reputationColor = reputation >= 90 ? 'text-emerald-400' : reputation >= 70 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className={`rounded-lg border p-4 ${online ? 'border-emerald-900 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="font-mono text-sm font-semibold text-white">{name}</span>
        </div>
        <span className="text-xs font-mono text-emerald-400">{version}</span>
      </div>

      <a
        href={`${ENS_APP}/${ensName}`}
        target="_blank"
        rel="noreferrer"
        className="block text-xs font-mono text-gray-400 hover:text-gray-200 mb-3 truncate"
      >
        {ensName}
      </a>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Reputation</span>
          <div className={`font-mono font-bold ${reputationColor}`}>{reputation}/100</div>
        </div>
        <div>
          <span className="text-gray-500">Tasks</span>
          <div className="font-mono font-bold text-white">{taskCount}</div>
        </div>
        <div>
          <span className="text-gray-500">Earnings</span>
          <div className="font-mono font-bold text-emerald-400">${earnings} USDC</div>
        </div>
        <div>
          <span className="text-gray-500">iNFT</span>
          {inftTokenId ? (
            <a
              href={`${ZG_EXPLORER}/token/${INFT_CONTRACT}/${inftTokenId}`}
              target="_blank"
              rel="noreferrer"
              className="block font-mono font-bold text-purple-400 hover:text-purple-300"
            >
              #{inftTokenId} ↗
            </a>
          ) : (
            <div className="font-mono text-gray-600">—</div>
          )}
        </div>
      </div>

      {evolves && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Evolution progress</span>
            <span className="font-mono text-purple-400">{trainingExamples}/{EVOLUTION_THRESHOLD}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (trainingExamples / EVOLUTION_THRESHOLD) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {axlPubkey && (
        <div className="mt-2 text-xs font-mono text-gray-600 truncate" title={axlPubkey}>
          AXL: {axlPubkey.slice(0, 20)}…
        </div>
      )}
    </div>
  )
}
