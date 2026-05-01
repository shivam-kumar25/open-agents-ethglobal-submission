import type { Agent } from '@neuralmesh/sdk'
import { getAaveYields, getProtocolTVL, getTokenPrice, getUniswapPools } from './defi-tools.js'

export async function startResearcher(agent: Agent): Promise<void> {
  console.log('[researcher] Ready. Serving research service...')

  agent.serve('research', async (args, meta) => {
    const query = String(args['query'] ?? '')
    const taskId = meta.taskId
    console.log(`[researcher] Research request ${taskId}: ${query}`)
    const startMs = Date.now()

    // Fetch real DeFi data first (context for inference)
    const [aaveYields, ethPrice] = await Promise.all([
      getAaveYields().catch(() => ({})),
      getTokenPrice('eth').catch(() => 0),
    ])

    const contextData = `
Current market data:
- Aave USDC yield: ${(aaveYields as Record<string, number>)['USDC'] ?? 'N/A'}%
- ETH price: $${ethPrice}
`
    // Run inference on 0G Compute with real data as context
    const result = await agent.think(
      `${contextData}\n\nResearch query: ${query}`,
      {
        systemPrompt:
          'You are a DeFi research agent. Use the provided market data to give accurate, concise answers. Include specific numbers when available.',
      },
    )

    // Store result in 0G Storage KV
    await agent.remember(`result:${taskId}`, { query, result, timestamp: Date.now() })

    // Log to training buffer (accumulates toward evolution threshold)
    await agent.log('training', { query, result, taskId, processingTimeMs: Date.now() - startMs })

    console.log(`[researcher] Task ${taskId} done (${Date.now() - startMs}ms)`)
    return result
  })

  console.log('[researcher] Service loop active.')
  await new Promise(() => {})
}
