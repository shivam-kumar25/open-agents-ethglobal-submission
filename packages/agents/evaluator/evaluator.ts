import type { Agent } from '@neuralmesh/sdk'
import type { ENSResolver } from '@neuralmesh/sdk'

export async function startEvaluator(agent: Agent, ens: ENSResolver): Promise<void> {
  console.log('[evaluator] Ready. Serving evaluate service...')

  agent.serve('evaluate', async (args, meta) => {
    const taskId = String(args['taskId'] ?? '')
    const query = String(args['query'] ?? '')
    const result = String(args['result'] ?? '')
    const targetAgent = String(args['targetAgent'] ?? 'researcher.neuralmesh.eth')

    console.log(`[evaluator] Scoring task ${taskId} for ${targetAgent}`)

    // Score using 0G Compute inference
    const scoreResponse = await agent.think(
      `Evaluate this AI research response. Score accuracy (0-100), speed (assume 2s = 100 pts), and relevance (0-100).

      Query: ${query}
      Response: ${result}

      Return JSON: {"accuracy": 85, "speed": 90, "relevance": 88, "reasoning": "..."}`
    )

    let breakdown = { accuracy: 85, speed: 90, relevance: 88 }
    try {
      const jsonMatch = scoreResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { accuracy?: number; speed?: number; relevance?: number }
        breakdown = {
          accuracy: parsed.accuracy ?? 85,
          speed: parsed.speed ?? 90,
          relevance: parsed.relevance ?? 88,
        }
      }
    } catch { /* use defaults */ }

    const score = Math.round(0.5 * breakdown.accuracy + 0.3 * breakdown.relevance + 0.2 * breakdown.speed)

    // Write score to target agent's ENS neural-reputation text record
    try {
      await ens.setText(targetAgent, 'neural-reputation', String(score), process.env['PRIVATE_KEY']!)
      await ens.setText(
        targetAgent,
        'neural-tasks',
        String((parseInt(await ens.getText(targetAgent, 'neural-tasks') ?? '0', 10) || 0) + 1),
        process.env['PRIVATE_KEY']!,
      )
      console.log(`[evaluator] Updated ENS neural-reputation for ${targetAgent}: ${score}`)
    } catch (e) {
      console.warn(`[evaluator] ENS update failed for ${targetAgent}:`, e)
    }

    // Broadcast score via GossipSub
    await agent.broadcast('scores', {
      taskId,
      targetAgent,
      score,
      breakdown,
      evaluatorName: 'evaluator.neuralmesh.eth',
      timestamp: Date.now(),
    })

    // Log evaluation
    await agent.log('evaluations', { taskId, targetAgent, score, breakdown })

    console.log(`[evaluator] Task ${taskId} score: ${score} (acc=${breakdown.accuracy} rel=${breakdown.relevance} spd=${breakdown.speed})`)
    return { taskId, score, breakdown, targetAgent }
  })

  await new Promise(() => {})
}
