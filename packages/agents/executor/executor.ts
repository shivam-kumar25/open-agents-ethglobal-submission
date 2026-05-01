import type { Agent } from '@neuralmesh/sdk'

export async function startExecutor(agent: Agent): Promise<void> {
  console.log('[executor] Ready. Serving execute service...')

  agent.serve('execute', async (args, meta) => {
    const taskId = meta.taskId
    const action = args as { contract?: string; method?: string; args?: unknown[]; action?: string; description?: string }
    console.log(`[executor] Execute request ${taskId}:`, action)

    const contract = action.contract ?? ''
    const method = action.method ?? 'execute'
    const callArgs = action.args ?? []
    const description = action.description ?? action.action ?? `${method} on ${contract}`

    // Simulate first
    const simulationResult = await simulateAction(contract, method, callArgs)
    console.log(`[executor] Simulation: risk=${simulationResult.riskLevel}, gas≈${simulationResult.gasEstimate}`)

    if (simulationResult.riskLevel === 'high') {
      return {
        success: false,
        taskId,
        error: `High-risk action blocked: ${description}`,
        simulation: simulationResult,
      }
    }

    // Execute via KeeperHub (MEV protection + retry + audit trail)
    const txHash = await agent.execute({ contract, method, args: callArgs, description })

    // Write audit entry to 0G Storage
    await agent.remember(`audit:${taskId}`, {
      taskId,
      action: { contract, method, args: callArgs },
      simulation: simulationResult,
      execution: { txHash, success: true },
      requestedBy: meta.from,
      timestamp: Date.now(),
    })
    await agent.log('audit', {
      taskId, contract, method, txHash, requestedBy: meta.from,
    })

    console.log(`[executor] Task ${taskId} executed. Tx: ${txHash}`)
    return { success: true, txHash, taskId, simulation: simulationResult }
  })

  await new Promise(() => {})
}

async function simulateAction(contract: string, method: string, args: unknown[]) {
  // For testnet: return low-risk estimate for known safe methods
  const safeMethods = ['transfer', 'approve', 'deposit', 'withdraw']
  const riskLevel = safeMethods.includes(method.toLowerCase()) ? 'low' : 'medium'
  return { expected: `${method}(${args.join(', ')})`, gasEstimate: 150_000, riskLevel }
}
