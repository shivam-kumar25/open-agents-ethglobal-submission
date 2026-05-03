/**
 * Planner Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE PLANNER AGENT?                                 │
 * │                                                             │
 * │  The Planner is the "boss" of the NeuralMesh system.        │
 * │  When YOU send a task (like "research DeFi yields"), the    │
 * │  Planner receives it, breaks it into steps, hires the right │
 * │  specialist agents, coordinates the work, and pays them.    │
 * │                                                             │
 * │  Think of it as a project manager: you give the goal,       │
 * │  it figures out who does what and routes payments.          │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WHAT DO YOU NEED?
 *   - TOKENROUTER_API_KEY in .env (for AI task decomposition)
 *   - SEPOLIA_RPC_URL in .env (for ENS peer discovery)
 *   - KEEPERHUB_API_KEY in .env (for x402 micropayments)
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, ports 9002 (AXL) and 9003 (HTTP task server).
 *   The dashboard connects to port 9003 to submit tasks.
 */
export const config = {
  ensName: process.env['PLANNER_ENS'] ?? 'planner.neuralmesh.eth',
  axlApiPort: parseInt(process.env['PLANNER_AXL_API_PORT'] ?? '9002', 10),
  axlTcpPort: parseInt(process.env['PLANNER_AXL_TCP_PORT'] ?? '7000', 10),
  axlKeyPath: process.env['PLANNER_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/planner.pem',
  model: process.env['TOKENROUTER_MODEL'] ?? 'meta-llama/Llama-3.1-8B-Instruct',
  capabilities: ['plan', 'decompose', 'coordinate'],
}
