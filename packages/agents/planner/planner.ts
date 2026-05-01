import type { Agent } from '@neuralmesh/sdk'

export async function runPlannerLoop(agent: Agent): Promise<void> {
  console.log('[planner] Ready. Serving plan service...')

  agent.serve('plan', async (args, meta) => {
    const query = String(args['query'] ?? '')
    const taskId = meta.taskId
    console.log(`[planner] Task ${taskId}: ${query}`)
    const startMs = Date.now()

    // 1. Decompose the query using sealed TEE inference (auditable decision)
    const decomposition = await agent.think(
      `Decompose this user request into research and execution subtasks.
      Return JSON: {"research": ["query1", "query2"], "execute": [{"action": "...", "contract": "..."}]}

      Request: ${query}`,
      { model: 'GLM-5-FP8', systemPrompt: 'You are a task orchestrator for a decentralized AI network.' },
    )

    let plan: { research?: string[]; execute?: Array<{ action: string; contract?: string }> }
    try {
      const jsonMatch = decomposition.match(/\{[\s\S]*\}/)
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) as typeof plan : { research: [query] }
    } catch {
      plan = { research: [query] }
    }

    await agent.remember(`task:${taskId}:plan`, plan)

    // 2. Find and call researcher for each research subtask
    let researchResult = ''
    if (plan.research && plan.research.length > 0) {
      try {
        const researcher = await agent.find('researcher.neuralmesh.eth')
        const results = await Promise.all(
          plan.research.map((q) => researcher.call('research', { query: q, taskId })),
        )
        researchResult = results.map(String).join('\n\n')
      } catch (e) {
        console.error('[planner] Researcher call failed:', e)
        researchResult = `Research unavailable: ${e}`
      }
    }

    // 3. If onchain execution needed, call executor
    if (plan.execute && plan.execute.length > 0) {
      try {
        const executor = await agent.find('executor.neuralmesh.eth')
        for (const action of plan.execute) {
          await executor.call('execute', { ...action, taskId })
        }
      } catch (e) {
        console.error('[planner] Executor call failed:', e)
      }
    }

    // 4. Synthesize final answer
    const finalAnswer = await agent.think(
      `Synthesize this research into a clear, actionable answer:\n\nQuery: ${query}\n\nResearch: ${researchResult}`,
      { systemPrompt: 'You are a helpful AI assistant. Be concise and accurate.' },
    )

    // 5. Have evaluator score the result
    let score = 85
    try {
      const evaluator = await agent.find('evaluator.neuralmesh.eth')
      const evaluation = await evaluator.call('evaluate', {
        taskId,
        query,
        result: finalAnswer,
        targetAgent: 'researcher.neuralmesh.eth',
      })
      score = (evaluation as { score?: number })?.score ?? 85
    } catch (e) {
      console.warn('[planner] Evaluator call failed:', e)
    }

    // 6. Log to training buffer and 0G Storage
    await agent.remember(`task:${taskId}:result`, { query, result: finalAnswer, score })
    await agent.log('tasks', {
      taskId,
      query,
      result: finalAnswer,
      score,
      processingTimeMs: Date.now() - startMs,
    })

    console.log(`[planner] Task ${taskId} complete. Score: ${score}`)
    return { taskId, result: finalAnswer, score, processingTimeMs: Date.now() - startMs }
  })

  // Keep running — recv loop is started internally by Agent
  console.log('[planner] Task loop active. Waiting for tasks...')
  await new Promise(() => {}) // run forever
}
