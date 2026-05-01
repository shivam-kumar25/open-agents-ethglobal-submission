export interface WorkflowCall {
  workflowId: string
  inputs: Record<string, unknown>
}

export interface WorkflowResult {
  success: boolean
  txHash?: string
  output: unknown
  executedAt: number
  executionId?: string
}

export class KeeperHub {
  private baseUrl = 'https://api.keeperhub.io'

  constructor(private config: { apiKey: string; walletAddress: string }) {}

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    }
  }

  async callWorkflow(call: WorkflowCall): Promise<WorkflowResult> {
    const res = await fetch(`${this.baseUrl}/workflows/${call.workflowId}/execute`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        inputs: call.inputs,
        wallet: this.config.walletAddress,
      }),
    })
    if (!res.ok) throw new Error(`KeeperHub workflow failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as {
      success?: boolean
      txHash?: string
      output?: unknown
      executionId?: string
    }
    return {
      success: data.success ?? true,
      txHash: data.txHash,
      output: data.output,
      executedAt: Date.now(),
      executionId: data.executionId,
    }
  }

  async searchWorkflows(query: string): Promise<Array<{ id: string; name: string; description: string }>> {
    const res = await fetch(`${this.baseUrl}/workflows/search?q=${encodeURIComponent(query)}`, {
      headers: this.headers,
    })
    if (!res.ok) return []
    const data = await res.json() as { workflows?: Array<{ id: string; name: string; description: string }> }
    return data.workflows ?? []
  }

  async getWorkflowStatus(executionId: string): Promise<{ status: string; result?: unknown }> {
    const res = await fetch(`${this.baseUrl}/executions/${executionId}`, { headers: this.headers })
    if (!res.ok) return { status: 'unknown' }
    return res.json() as Promise<{ status: string; result?: unknown }>
  }

  async triggerEvolution(agentName: string, datasetRoot: string): Promise<WorkflowResult> {
    return this.callWorkflow({
      workflowId: 'neuralmesh-evolution-trigger',
      inputs: { agentName, datasetRoot, timestamp: Date.now() },
    })
  }

  async settlePayment(from: string, to: string, amountUsdc: string): Promise<WorkflowResult> {
    return this.callWorkflow({
      workflowId: 'neuralmesh-payment-settle',
      inputs: { from, to, amountUsdc, timestamp: Date.now() },
    })
  }

  async executeOnchain(contractAddress: string, method: string, args: unknown[]): Promise<WorkflowResult> {
    return this.callWorkflow({
      workflowId: 'neuralmesh-onchain-executor',
      inputs: { contractAddress, method, args },
    })
  }

  async reportHealth(agentName: string, status: Record<string, unknown>): Promise<WorkflowResult> {
    return this.callWorkflow({
      workflowId: 'neuralmesh-agent-health',
      inputs: { agentName, status, timestamp: Date.now() },
    })
  }

  async monitorYield(protocols: string[]): Promise<WorkflowResult> {
    return this.callWorkflow({
      workflowId: 'neuralmesh-defi-yield-monitor',
      inputs: { protocols, timestamp: Date.now() },
    })
  }
}
