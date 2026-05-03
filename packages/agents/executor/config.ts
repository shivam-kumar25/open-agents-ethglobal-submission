/**
 * Executor Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE EXECUTOR AGENT?                                │
 * │                                                             │
 * │  The Executor is the "hands" of the NeuralMesh system.      │
 * │  While other agents think and plan, the Executor DOES       │
 * │  things: it sends blockchain transactions, triggers smart   │
 * │  contract calls, and executes DeFi operations.             │
 * │                                                             │
 * │  Safety first: every action goes through KeeperHub —        │
 * │  an automated workflow engine that simulates the tx first,  │
 * │  checks gas costs, and only executes if it looks safe.      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WHAT DO YOU NEED?
 *   - PRIVATE_KEY in .env (your wallet that signs transactions)
 *   - KEEPERHUB_API_KEY in .env (for automated workflow execution)
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9022. Logs: logs/executor.log
 */
export const config = {
  ensName: process.env['EXECUTOR_ENS'] ?? 'executor.neuralmesh.eth',
  axlApiPort: parseInt(process.env['EXECUTOR_AXL_API_PORT'] ?? '9022', 10),
  axlKeyPath: process.env['EXECUTOR_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/executor.pem',
  model: process.env['TOKENROUTER_MODEL'] ?? 'meta-llama/Llama-3.1-8B-Instruct',
  capabilities: ['execute', 'simulate', 'audit'],
}
