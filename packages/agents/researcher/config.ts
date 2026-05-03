/**
 * Researcher Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE RESEARCHER AGENT?                              │
 * │                                                             │
 * │  The Researcher is the "librarian + analyst" of the system. │
 * │  When the Planner says "find out the best DeFi yields",     │
 * │  the Researcher synthesizes DeFi data and uses AI to give   │
 * │  a detailed, scored answer.                                 │
 * │                                                             │
 * │  What makes it special: it LEARNS over time.               │
 * │  Every 50 tasks, the evolution agent bumps its ENS version. │
 * │  The version bump is verifiable on Ethereum (Sepolia ENS).  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9015. Logs: logs/researcher.log
 *
 * WHAT DO YOU NEED?
 *   - TOKENROUTER_API_KEY in .env (for AI inference)
 *   - SEPOLIA_RPC_URL in .env (for ENS peer discovery)
 */
export const config = {
  ensName: process.env['RESEARCHER_ENS'] ?? 'researcher.neuralmesh.eth',
  axlApiPort: parseInt(process.env['RESEARCHER_AXL_API_PORT'] ?? '9015', 10),
  axlTcpPort: parseInt(process.env['RESEARCHER_AXL_TCP_PORT'] ?? '7001', 10),
  axlKeyPath: process.env['RESEARCHER_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/researcher.pem',
  model: process.env['TOKENROUTER_MODEL'] ?? 'meta-llama/Llama-3.1-8B-Instruct',
  capabilities: ['research', 'analyze', 'synthesize'],
  evolve: true,
  evolutionThreshold: parseInt(process.env['EVOLUTION_TASK_THRESHOLD'] ?? '50', 10),
}
