/**
 * Researcher Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE RESEARCHER AGENT?                              │
 * │                                                             │
 * │  The Researcher is the "librarian + analyst" of the system. │
 * │  When the Planner says "find out the best DeFi yields",     │
 * │  the Researcher digs through on-chain data, protocols,      │
 * │  and its own memory to give a detailed answer.              │
 * │                                                             │
 * │  What makes it special: it LEARNS over time.               │
 * │  Every 50 tasks, it fine-tunes itself using 0G's            │
 * │  infrastructure — so it gets better at DeFi research        │
 * │  without you doing anything. This is the "evolution" part.  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * HOW DOES IT LEARN?
 *   1. After each task, its output is saved to 0G Storage.
 *   2. When it hits the evolution threshold (50 tasks by default),
 *      the Evolution agent triggers a fine-tuning job on 0G Compute.
 *   3. The new LoRA adapter (a small AI model patch) is stored as
 *      an iNFT on the 0G blockchain — the agent literally "owns"
 *      its own intelligence upgrade.
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9012. Logs: logs/researcher.log
 */
export const config = {
  // ── Identity ──────────────────────────────────────────────────────────────
  // The researcher's ENS name on Sepolia. Other agents look this up
  // when they need someone to research something.
  // TO CUSTOMIZE: Set RESEARCHER_ENS in .env
  ensName: process.env['RESEARCHER_ENS'] ?? 'researcher.neuralmesh.eth',

  // ── AXL P2P Network Ports ─────────────────────────────────────────────────
  // Port 9012 = the HTTP port your code uses to reach this agent.
  // Port 7001 = the internal AXL peer-to-peer port (don't change unless conflicting).
  // Each agent needs different ports so they don't step on each other.
  axlApiPort: parseInt(process.env['RESEARCHER_AXL_API_PORT'] ?? '9012', 10),
  axlTcpPort: parseInt(process.env['RESEARCHER_AXL_TCP_PORT'] ?? '7001', 10),

  // ── AXL Identity Key ──────────────────────────────────────────────────────
  // The researcher's unique cryptographic identity on the AXL mesh.
  // Run `pnpm keys` to generate this file before starting agents.
  axlKeyPath: process.env['RESEARCHER_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/researcher.pem',

  // ── AI Model ──────────────────────────────────────────────────────────────
  // Qwen 2.5 7B is excellent at analytical tasks and long-form synthesis.
  // It reads protocol docs, summarizes on-chain activity, and compares options.
  // Runs via 0G Compute — set ZG_COMPUTE_API_KEY in .env to use it.
  model: 'qwen/qwen-2.5-7b-instruct',

  // ── Capabilities ──────────────────────────────────────────────────────────
  //   research   — gather and synthesize information on a topic
  //   analyze    — compare options, spot patterns, identify risks
  //   synthesize — combine multiple sources into a coherent recommendation
  capabilities: ['research', 'analyze', 'synthesize'],

  // ── Evolution (self-improvement) ──────────────────────────────────────────
  // evolve: true means this agent participates in the evolution loop.
  // After `evolutionThreshold` tasks, it triggers fine-tuning on 0G.
  // WHY ONLY RESEARCHER? It's the most knowledge-heavy agent — it benefits
  // most from learning. The executor follows strict rules (safer not to evolve).
  //
  // WHAT HAPPENS DURING EVOLUTION?
  //   1. Task history is exported from 0G Storage as training data
  //   2. A fine-tuning job runs on 0G Compute infrastructure
  //   3. The resulting LoRA adapter is minted as an iNFT (onchain proof)
  //   4. The researcher loads the new adapter and gets smarter
  //
  // TO DISABLE EVOLUTION: Set evolve to false or remove ZG_FINETUNE_PROVIDER from .env
  // TO CHANGE THRESHOLD: Set EVOLUTION_TASK_THRESHOLD in .env (e.g., "100" for less frequent)
  evolve: true,
  evolutionThreshold: parseInt(process.env['EVOLUTION_TASK_THRESHOLD'] ?? '50', 10),
}
