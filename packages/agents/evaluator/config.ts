/**
 * Evaluator Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE EVALUATOR AGENT?                               │
 * │                                                             │
 * │  The Evaluator is the "quality control inspector".          │
 * │  After the Researcher gives an answer or the Executor       │
 * │  runs a transaction, the Evaluator checks: "Was that good?" │
 * │                                                             │
 * │  It scores results on a 0–100 scale and writes the score    │
 * │  to ENS as a "reputation" record. This reputation travels   │
 * │  with the agent — the next time someone needs a researcher, │
 * │  they can look up ENS and see "this agent has 87/100 rep."  │
 * │                                                             │
 * │  Think of it like a Yelp reviewer for AI agents.            │
 * └─────────────────────────────────────────────────────────────┘
 *
 * HOW DOES IT UPDATE REPUTATION?
 *   It calls ENSResolver.setText(agentName, 'reputation', score)
 *   This writes to the Ethereum Name Service on Sepolia testnet.
 *   Anyone can read it — fully transparent, onchain provenance.
 *
 * WHY IS REPUTATION IMPORTANT?
 *   In a decentralized system, you need TRUST signals.
 *   ENS reputation lets any new agent decide "should I hire this
 *   researcher?" based on their track record — no central authority.
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9032. Logs: logs/evaluator.log
 */
export const config = {
  // ── Identity ──────────────────────────────────────────────────────────────
  // The evaluator's ENS name. Used by the Planner to route scoring requests.
  ensName: process.env['EVALUATOR_ENS'] ?? 'evaluator.neuralmesh.eth',

  // ── AXL P2P Network Ports ─────────────────────────────────────────────────
  // Port 9032 = the HTTP port used to send scoring tasks to this agent.
  axlApiPort: parseInt(process.env['EVALUATOR_AXL_API_PORT'] ?? '9032', 10),

  // ── AXL Identity Key ──────────────────────────────────────────────────────
  // Unique cryptographic key for this agent on the AXL mesh.
  // Run `pnpm keys` once to generate all 5 agent keys at once.
  axlKeyPath: process.env['EVALUATOR_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/evaluator.pem',

  // ── AI Model ──────────────────────────────────────────────────────────────
  // Qwen 2.5 7B is used for nuanced quality assessment — scoring requires
  // understanding context, intent, and correctness, not just keyword matching.
  model: 'qwen/qwen-2.5-7b-instruct',

  // ── Capabilities ──────────────────────────────────────────────────────────
  //   evaluate — score a task result against the original goal (0–100)
  //   score    — produce structured quality metrics (accuracy, completeness, safety)
  //   rank     — compare multiple agent responses to pick the best one
  capabilities: ['evaluate', 'score', 'rank'],
}
