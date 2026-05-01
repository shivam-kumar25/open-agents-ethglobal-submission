import { useState, useEffect } from 'react'
import { ZG_STORAGE_EXPLORER, EVOLUTION_THRESHOLD } from '../config.js'

interface EvolutionProgressProps {
  trainingExamples: number
  lastEvolutionTimestamp: number | null
  loraRoot: string | null
  currentVersion: string
}

const FINETUNE_STATES = [
  'Init', 'SettingUp', 'SetUp', 'Training', 'Trained',
  'Delivering', 'Delivered', 'UserAcknowledged', 'Finished',
] as const

export function EvolutionProgress({
  trainingExamples, lastEvolutionTimestamp, loraRoot, currentVersion,
}: EvolutionProgressProps) {
  const [activeState, setActiveState] = useState<string | null>(null)
  const [deliveredAt, setDeliveredAt] = useState<number | null>(null)
  const [timeLeft48h, setTimeLeft48h] = useState<string | null>(null)
  const [versionBumped, setVersionBumped] = useState(false)

  const pct = Math.min(100, (trainingExamples / EVOLUTION_THRESHOLD) * 100)
  const isEvolving = activeState !== null && activeState !== 'Finished'

  // Countdown if in Delivered state
  useEffect(() => {
    if (activeState !== 'Delivered' || !deliveredAt) { setTimeLeft48h(null); return }
    const update = () => {
      const elapsed = Date.now() - deliveredAt
      const remaining = 48 * 60 * 60 * 1000 - elapsed
      if (remaining <= 0) { setTimeLeft48h('EXPIRED'); return }
      const h = Math.floor(remaining / 3600000)
      const m = Math.floor((remaining % 3600000) / 60000)
      setTimeLeft48h(`${h}h ${m}m`)
    }
    update()
    const iv = setInterval(update, 60000)
    return () => clearInterval(iv)
  }, [activeState, deliveredAt])

  // Simulate evolution state progression for demo
  useEffect(() => {
    if (trainingExamples >= EVOLUTION_THRESHOLD && !isEvolving && activeState === null) {
      let i = 0
      const advance = () => {
        if (i >= FINETUNE_STATES.length) { setActiveState('Finished'); return }
        const state = FINETUNE_STATES[i]!
        setActiveState(state)
        if (state === 'Delivered') setDeliveredAt(Date.now())
        if (state === 'Finished') setVersionBumped(true)
        i++
        setTimeout(advance, state === 'Training' ? 3000 : state === 'Trained' ? 2000 : 1000)
      }
      advance()
    }
  }, [trainingExamples, isEvolving, activeState])

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Evolution Loop</h3>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Training examples</span>
          <span className="font-mono text-purple-400">{trainingExamples}/{EVOLUTION_THRESHOLD}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-purple-400 animate-pulse' : 'bg-purple-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Fine-tuning state machine */}
      {isEvolving && (
        <div className="mb-4 p-3 rounded bg-purple-950 border border-purple-800">
          <div className="text-xs text-purple-300 mb-2 font-semibold">Fine-tuning in progress</div>
          <div className="flex flex-wrap gap-1">
            {FINETUNE_STATES.map((state) => {
              const idx = FINETUNE_STATES.indexOf(state as typeof FINETUNE_STATES[number])
              const activeIdx = activeState ? FINETUNE_STATES.indexOf(activeState as typeof FINETUNE_STATES[number]) : -1
              const done = idx < activeIdx
              const current = state === activeState
              return (
                <span
                  key={state}
                  className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    done ? 'bg-green-900 text-green-300' :
                    current ? 'bg-purple-700 text-white animate-pulse' :
                    'bg-gray-800 text-gray-600'
                  }`}
                >
                  {state}
                </span>
              )
            })}
          </div>
          {activeState === 'Delivered' && timeLeft48h && (
            <div className="mt-2 text-xs font-mono text-red-400 animate-pulse">
              ⚠ Acknowledge within: {timeLeft48h}
            </div>
          )}
        </div>
      )}

      {/* Version bump animation */}
      {versionBumped && (
        <div className="mb-3 p-2 rounded bg-emerald-950 border border-emerald-800 text-xs">
          <span className="text-emerald-400 font-semibold">✓ Evolution complete!</span>
          <span className="text-gray-400 ml-2">→ </span>
          <span className={`font-mono text-emerald-300 ${versionBumped ? 'animate-pulse' : ''}`}>{currentVersion}</span>
        </div>
      )}

      {/* Last evolution info */}
      {lastEvolutionTimestamp && (
        <div className="text-xs text-gray-500 mb-2">
          Last: {new Date(lastEvolutionTimestamp).toLocaleString()}
        </div>
      )}

      {/* LoRA root */}
      {loraRoot && (
        <div className="text-xs">
          <span className="text-gray-500">LoRA Merkle root: </span>
          <a
            href={`${ZG_STORAGE_EXPLORER}/file/${loraRoot}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-purple-400 hover:text-purple-300"
          >
            {loraRoot.slice(0, 16)}… ↗
          </a>
        </div>
      )}
    </div>
  )
}
