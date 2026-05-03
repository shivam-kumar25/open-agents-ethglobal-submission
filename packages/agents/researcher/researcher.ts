import type { Agent } from '@neuralmesh/sdk'

export async function startResearcher(agent: Agent): Promise<void> {
  console.log('[researcher] Ready. Serving research service...')

  agent.serve('research', async (args, meta) => {
    const query = String(args['query'] ?? '')
    const taskId = meta.taskId
    console.log(`[researcher] Research request ${taskId}: ${query}`)
    const startMs = Date.now()

    const result = await agent.think(
      `Research query: ${query}`,
      {
        systemPrompt:
          'You are a research agent. Give accurate, well-reasoned, concise answers. Include specific facts, numbers, and comparisons where relevant.',
      },
    )

    await agent.remember(`result:${taskId}`, { query, result, timestamp: Date.now() })
    await agent.log('training', { query, result, taskId, processingTimeMs: Date.now() - startMs })

    console.log(`[researcher] Task ${taskId} done (${Date.now() - startMs}ms)`)
    return result
  })

  console.log('[researcher] Service loop active.')
  await new Promise(() => {})
}
