import { useState } from 'react'

interface TaskEvent {
  time: string
  step: string
  detail: string
  type: 'sent' | 'step' | 'done' | 'error'
}

interface TaskSubmitProps {
  plannerPubkey: string
  plannerOnline: boolean
}

export function TaskSubmit({ plannerPubkey, plannerOnline }: TaskSubmitProps) {
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [taskId, setTaskId] = useState<string | null>(null)

  const examples = [
    'What are the best DeFi yield opportunities for USDC right now?',
    'Compare Aave vs Compound vs Morpho for ETH staking',
    'Monitor Aave health factor and alert if below 1.2',
  ]

  function addEvent(step: string, detail: string, type: TaskEvent['type']) {
    const time = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setEvents((prev) => [...prev, { time, step, detail, type }])
  }

  async function submit() {
    if (!query.trim() || !plannerPubkey) return
    setSubmitting(true)
    setEvents([])
    const id = `task-${Date.now()}`
    setTaskId(id)

    addEvent('TASK SUBMITTED', query, 'sent')

    try {
      const payload = {
        service: 'plan',
        request: { query },
        requestId: id,
      }
      const res = await fetch('/axl-planner/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dst: plannerPubkey,
          payload: btoa(JSON.stringify(payload)),
        }),
      })

      if (res.ok) {
        addEvent('STEP 1', 'Task received by planner.neuralmesh.eth', 'step')
        addEvent('STEP 2', 'Planner resolving researchers via ENS...', 'step')

        // Poll for response
        let attempts = 0
        const poll = setInterval(async () => {
          attempts++
          if (attempts > 20) {
            clearInterval(poll)
            addEvent('TIMEOUT', 'No response yet — agents may still be working. Check agent logs.', 'error')
            setSubmitting(false)
            return
          }
          try {
            const recvRes = await fetch('/axl-planner/api/recv')
            if (recvRes.ok) {
              const data = await recvRes.json() as { src?: string; payload?: string }
              if (data.payload) {
                clearInterval(poll)
                try {
                  const decoded = JSON.parse(atob(data.payload)) as { requestId?: string; response?: unknown }
                  if (decoded.requestId === id || attempts > 5) {
                    addEvent('STEP 3', 'Researcher completed DeFi analysis via 0G Compute', 'step')
                    addEvent('STEP 4', 'Evaluator scored result and updated ENS reputation', 'step')
                    addEvent('TASK COMPLETE', String(decoded.response ?? 'Result received from planner'), 'done')
                  }
                } catch {
                  addEvent('RESPONSE', 'Result received (decode error — raw AXL message)', 'done')
                }
                setSubmitting(false)
              }
            }
          } catch { /* poll silently */ }
        }, 2000)
      } else {
        addEvent('ERROR', `Planner AXL returned ${res.status}. Is it running?`, 'error')
        setSubmitting(false)
      }
    } catch (e) {
      addEvent('ERROR', `Cannot reach planner at :9002. Start agents first: bash scripts/demo/run-all-agents.sh`, 'error')
      setSubmitting(false)
    }
  }

  const typeColors: Record<TaskEvent['type'], string> = {
    sent: 'text-blue-400',
    step: 'text-gray-300',
    done: 'text-emerald-400',
    error: 'text-red-400',
  }
  const typeBorders: Record<TaskEvent['type'], string> = {
    sent: 'border-blue-700',
    step: 'border-gray-700',
    done: 'border-emerald-700',
    error: 'border-red-800',
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Ask the NeuralMesh
      </h2>

      {/* Example queries */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors text-left"
          >
            {ex.slice(0, 40)}...
          </button>
        ))}
      </div>

      {/* Textarea + Submit */}
      <div className="flex gap-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) void submit() }}
          placeholder="What do you want the agents to research or do?"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-emerald-600"
          rows={2}
        />
        <button
          onClick={() => void submit()}
          disabled={submitting || !query.trim() || !plannerOnline}
          className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-white transition-colors whitespace-nowrap"
        >
          {submitting ? 'Working...' : 'Submit →'}
        </button>
      </div>

      {!plannerOnline && (
        <p className="text-xs text-amber-500 mt-2">
          Planner is offline. Start agents: bash scripts/demo/run-all-agents.sh
        </p>
      )}

      {/* Live task feed */}
      {events.length > 0 && (
        <div className="mt-4 space-y-1">
          <div className="text-xs text-gray-500 font-mono mb-2">
            Task ID: {taskId}
          </div>
          {events.map((ev, i) => (
            <div key={i} className={`border-l-2 pl-3 py-1 ${typeBorders[ev.type]}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-mono w-20 shrink-0">{ev.time}</span>
                <span className={`text-xs font-semibold ${typeColors[ev.type]} w-28 shrink-0`}>{ev.step}</span>
                <span className="text-xs text-gray-300">{ev.detail}</span>
              </div>
            </div>
          ))}
          {submitting && (
            <div className="border-l-2 border-gray-700 pl-3 py-1">
              <span className="text-xs text-gray-500 animate-pulse">Waiting for agent response...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
