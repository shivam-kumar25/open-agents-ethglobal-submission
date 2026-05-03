import type { Agent } from '@neuralmesh/sdk'
import type { ENSResolver } from '@neuralmesh/sdk'

interface EvalArgs {
  taskId: string
  query: string
  result: string
  targetAgent?: string
}

interface EvalResult {
  taskId: string
  score: number
  breakdown: { accuracy: number; speed: number; relevance: number }
  targetAgent: string
}

export async function runEvaluation(
  agent: Agent,
  ens: ENSResolver,
  args: EvalArgs,
): Promise<EvalResult> {
  const { taskId, query, result, targetAgent = 'researcher.neuralmesh.eth' } = args
  console.log(`[evaluator] Scoring task ${taskId} for ${targetAgent}`)

  const scoreResponse = await agent.think(
    `Evaluate this AI research response. Score each dimension 0–100.

    Query: ${query}
    Response: ${result}

    Return JSON only: {"accuracy": <int>, "speed": <int>, "relevance": <int>, "reasoning": "<one sentence>"}`,
  )

  let breakdown = { accuracy: 80, speed: 85, relevance: 80 }
  try {
    const jsonMatch = scoreResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { accuracy?: number; speed?: number; relevance?: number }
      breakdown = {
        accuracy:  Math.min(100, Math.max(0, parsed.accuracy  ?? 80)),
        speed:     Math.min(100, Math.max(0, parsed.speed     ?? 85)),
        relevance: Math.min(100, Math.max(0, parsed.relevance ?? 80)),
      }
    }
  } catch { /* use defaults */ }

  const score = Math.round(0.5 * breakdown.accuracy + 0.3 * breakdown.relevance + 0.2 * breakdown.speed)

  try {
    await ens.setText(targetAgent, 'neural-reputation', String(score), process.env['PRIVATE_KEY']!)
    const currentTasks = parseInt(await ens.getText(targetAgent, 'neural-tasks') ?? '0', 10) || 0
    const newTaskCount = currentTasks + 1
    await ens.setText(targetAgent, 'neural-tasks', String(newTaskCount), process.env['PRIVATE_KEY']!)
    console.log(`[evaluator] ENS neural-reputation for ${targetAgent}: ${score}`)
  } catch (e) {
    console.warn(`[evaluator] ENS update failed for ${targetAgent}:`, e)
  }

  try {
    await agent.broadcast('scores', {
      taskId, targetAgent, score, breakdown,
      evaluatorName: 'evaluator.neuralmesh.eth',
      timestamp: Date.now(),
    })
  } catch { /* non-fatal */ }

  agent.log('evaluations', { taskId, targetAgent, score, breakdown })
  console.log(`[evaluator] Task ${taskId} score: ${score} (acc=${breakdown.accuracy} rel=${breakdown.relevance} spd=${breakdown.speed})`)
  return { taskId, score, breakdown, targetAgent }
}

export async function startEvaluator(agent: Agent, ens: ENSResolver): Promise<void> {
  console.log('[evaluator] Ready. Serving evaluate service...')

  agent.serve('evaluate', async (args, _meta) => {
    return runEvaluation(agent, ens, {
      taskId:      String(args['taskId']      ?? ''),
      query:       String(args['query']       ?? ''),
      result:      String(args['result']      ?? ''),
      targetAgent: String(args['targetAgent'] ?? 'researcher.neuralmesh.eth'),
    })
  })

  await new Promise(() => {})
}
