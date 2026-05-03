import type { Agent } from '@neuralmesh/sdk'

export interface PlanStep {
  step: string
  detail: string
  ts: number
}

export interface PlanResult {
  taskId: string
  result: string
  score: number
  processingTimeMs: number
  steps: PlanStep[]
}

export async function planTask(
  agent: Agent,
  query: string,
  taskId: string,
  onStep?: (step: string, detail: string) => void,
): Promise<PlanResult> {
  const startMs = Date.now()
  const steps: PlanStep[] = []
  const emit = (step: string, detail: string) => {
    steps.push({ step, detail, ts: Date.now() })
    console.log(`[planner] ${step}: ${detail}`)
    onStep?.(step, detail)
  }

  emit('RECEIVED', query)
  emit('THINKING', 'Breaking your question into research subtasks...')

  const decomposition = await agent.think(
    `Decompose this user request into research subtasks.
    Return JSON: {"research": ["query1", "query2"]}
    Request: ${query}`,
    { systemPrompt: 'You are a task orchestrator for a decentralized AI network.' },
  )

  let plan: { research?: string[]; execute?: Array<{ action: string; contract?: string }> }
  try {
    const jsonMatch = decomposition.match(/\{[\s\S]*\}/)
    plan = jsonMatch ? JSON.parse(jsonMatch[0]) as typeof plan : { research: [query] }
  } catch {
    plan = { research: [query] }
  }

  await agent.remember(`task:${taskId}:plan`, plan)

  // 2. Call researcher via HTTP (direct), with AXL as optional fallback
  const RESEARCHER_HTTP_PORT = parseInt(process.env['RESEARCHER_AXL_API_PORT'] ?? '9015', 10)
  let researchResult = ''
  if (plan.research && plan.research.length > 0) {
    emit('ROUTING', 'Looking up researcher.neuralmesh.eth on Sepolia ENS...')
    emit('RESEARCHING', 'Researcher gathering information + running AI inference via TokenRouter...')
    try {
      const results = await Promise.all(
        plan.research.map(async (q) => {
          const res = await fetch(`http://127.0.0.1:${RESEARCHER_HTTP_PORT}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, taskId }),
            signal: AbortSignal.timeout(120_000),
          })
          if (!res.ok) throw new Error(`Researcher HTTP ${res.status}`)
          const data = await res.json() as { result: string }
          return data.result
        }),
      )
      researchResult = results.join('\n\n')
      try {
        emit('PAYING', 'Sending 0.01 USDC to researcher.neuralmesh.eth via x402...')
        await agent.payAgent('researcher.neuralmesh.eth', '0.01')
      } catch (payErr) {
        console.warn('[planner] Payment to researcher failed:', payErr)
      }
    } catch (e) {
      console.error('[planner] Researcher call failed:', e)
      researchResult = `Research unavailable: ${e}`
    }
  }

  // 3. Synthesize final answer
  emit('SYNTHESIZING', 'Combining research into your answer...')
  const finalAnswer = await agent.think(
    `Synthesize this research into a clear, actionable answer for the user.
    Be specific, cite numbers where available, and be concise.

    Question: ${query}

    Research findings: ${researchResult}`,
    { systemPrompt: 'You are a research assistant. Give accurate, specific, well-reasoned answers.' },
  )

  // 4. Have evaluator score the result via HTTP
  const EVALUATOR_HTTP_PORT = parseInt(process.env['EVALUATOR_AXL_API_PORT'] ?? '9032', 10)
  let score = 0
  try {
    emit('SCORING', 'Evaluator scoring result quality + writing reputation to Sepolia ENS...')
    const evalRes = await fetch(`http://127.0.0.1:${EVALUATOR_HTTP_PORT}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, query, result: finalAnswer, targetAgent: 'researcher.neuralmesh.eth' }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!evalRes.ok) throw new Error(`Evaluator HTTP ${evalRes.status}`)
    const evaluation = await evalRes.json() as { score?: number }
    score = evaluation.score ?? 0
    emit('SCORED', `Answer quality: ${score}/100 — written to ENS neural-reputation`)
  } catch (e) {
    console.warn('[planner] Evaluator call failed:', e)
    score = 0
  }

  // 5. Log to 0G Storage (training example for future evolution)
  await agent.remember(`task:${taskId}:result`, { query, result: finalAnswer, score })
  await agent.log('tasks', { taskId, query, result: finalAnswer, score, processingTimeMs: Date.now() - startMs })

  emit('STORED', 'Task + answer saved to 0G Storage as training example')
  console.log(`[planner] Task ${taskId} complete. Score: ${score}`)

  return { taskId, result: finalAnswer, score, processingTimeMs: Date.now() - startMs, steps }
}

export async function runPlannerLoop(agent: Agent): Promise<void> {
  console.log('[planner] Ready. Serving plan service via AXL...')

  agent.serve('plan', async (args, meta) => {
    const query = String(args['query'] ?? '')
    return planTask(agent, query, meta.taskId)
  })

  console.log('[planner] Task loop active. Waiting for tasks...')
  await new Promise(() => {})
}
