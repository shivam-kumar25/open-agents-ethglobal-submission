/**
 * Evaluator Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE EVALUATOR AGENT?                               │
 * │                                                             │
 * │  The Evaluator is the "quality control inspector".          │
 * │  After the Researcher gives an answer, the Evaluator        │
 * │  scores it: "Was that accurate? Relevant? Complete?"        │
 * │                                                             │
 * │  It scores results 0–100 and writes the score to ENS as     │
 * │  a "neural-reputation" text record. Reputation travels with │
 * │  the agent — verifiable by anyone on Ethereum.              │
 * │                                                             │
 * │  The evaluator also fires the KeeperHub evolution trigger   │
 * │  when the researcher's task count crosses the threshold.    │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WHAT DO YOU NEED?
 *   - TOKENROUTER_API_KEY in .env (for scoring inference)
 *   - PRIVATE_KEY in .env (to sign ENS reputation writes)
 *   - SEPOLIA_RPC_URL in .env (Ethereum Sepolia for ENS)
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9032. Logs: logs/evaluator.log
 */
export const config = {
  ensName: process.env['EVALUATOR_ENS'] ?? 'evaluator.neuralmesh.eth',
  axlApiPort: parseInt(process.env['EVALUATOR_AXL_API_PORT'] ?? '9032', 10),
  axlKeyPath: process.env['EVALUATOR_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/evaluator.pem',
  model: process.env['TOKENROUTER_MODEL'] ?? 'meta-llama/Llama-3.1-8B-Instruct',
  capabilities: ['evaluate', 'score', 'rank'],
}
