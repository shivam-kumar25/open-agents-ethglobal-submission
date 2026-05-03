import { EVOLUTION_THRESHOLD } from '../config.js'

interface EvolutionProgressProps {
  trainingExamples: number
  lastEvolutionTimestamp: number | null
  loraRoot: string | null
  currentVersion: string
}

export function EvolutionProgress({
  trainingExamples, lastEvolutionTimestamp, currentVersion,
}: EvolutionProgressProps) {
  const pct = Math.min(100, (trainingExamples / EVOLUTION_THRESHOLD) * 100)
  const evolved = trainingExamples >= EVOLUTION_THRESHOLD

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Evolution Loop</h3>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Tasks toward next evolution</span>
          <span className="font-mono text-purple-400">{trainingExamples}/{EVOLUTION_THRESHOLD}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${evolved ? 'bg-purple-400 animate-pulse' : 'bg-purple-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {evolved && currentVersion !== '—' && (
        <div className="mb-3 p-2 rounded bg-emerald-950 border border-emerald-800 text-xs">
          <span className="text-emerald-400 font-semibold">✓ Evolved!</span>
          <span className="text-gray-400 ml-2">→ </span>
          <span className="font-mono text-emerald-300">{currentVersion}</span>
          <span className="text-gray-600 ml-2">on ENS</span>
        </div>
      )}

      {lastEvolutionTimestamp && (
        <div className="text-xs text-gray-500">
          Last evolution: {new Date(lastEvolutionTimestamp).toLocaleString()}
        </div>
      )}
    </div>
  )
}
