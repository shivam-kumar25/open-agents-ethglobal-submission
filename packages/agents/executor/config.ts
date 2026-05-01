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
 * │                                                             │
 * │  Think of it as: the surgeon who does the operation,        │
 * │  but only after the anesthesiologist (KeeperHub) says OK.   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WHY DOES IT NOT EVOLVE?
 *   The Executor follows strict, deterministic rules. Evolving it
 *   could cause unexpected behavior when real money is involved.
 *   Stability > intelligence for execution. The Researcher evolves
 *   so it can give the Executor better instructions over time.
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9022. Logs: logs/executor.log
 *
 * WHAT DO YOU NEED TO USE IT?
 *   - PRIVATE_KEY in .env (your wallet that signs transactions)
 *   - KEEPERHUB_API_KEY in .env (for automated workflow scheduling)
 *   - ZG_RPC_URL in .env (the 0G blockchain endpoint for tx submission)
 */
export const config = {
  // ── Identity ──────────────────────────────────────────────────────────────
  // The executor's ENS name. Agents look up "executor.neuralmesh.eth"
  // when they need someone to run a blockchain action.
  ensName: process.env['EXECUTOR_ENS'] ?? 'executor.neuralmesh.eth',

  // ── AXL P2P Network Ports ─────────────────────────────────────────────────
  // Port 9022 = HTTP port for sending tasks to this agent.
  // (Note: executor has no separate tcpPort config — uses AXL default internally)
  axlApiPort: parseInt(process.env['EXECUTOR_AXL_API_PORT'] ?? '9022', 10),

  // ── AXL Identity Key ──────────────────────────────────────────────────────
  // Run `pnpm keys` to generate this before starting. Each agent gets a
  // unique key so the mesh can route messages to the right recipient.
  axlKeyPath: process.env['EXECUTOR_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/executor.pem',

  // ── AI Model ──────────────────────────────────────────────────────────────
  // Qwen 2.5 7B is used here for transaction planning and risk assessment —
  // "should I execute this swap at this price? what's the slippage risk?"
  // The actual execution is done via KeeperHub's deterministic engine.
  model: 'qwen/qwen-2.5-7b-instruct',

  // ── Capabilities ──────────────────────────────────────────────────────────
  //   execute   — submit transactions to the blockchain via KeeperHub
  //   simulate  — dry-run a transaction to check if it will succeed and cost
  //   audit     — review a plan for security risks before executing it
  capabilities: ['execute', 'simulate', 'audit'],
}
