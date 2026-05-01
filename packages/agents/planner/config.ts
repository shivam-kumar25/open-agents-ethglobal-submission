/**
 * Planner Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE PLANNER AGENT?                                 │
 * │                                                             │
 * │  The Planner is the "boss" of the NeuralMesh system.        │
 * │  When YOU send a task (like "research DeFi yields and       │
 * │  execute a swap"), the Planner receives it, breaks it into  │
 * │  smaller steps, and hires the right specialist agents.      │
 * │                                                             │
 * │  Think of it like a project manager at a company:           │
 * │  you give them the goal, they figure out who does what.     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * HOW DOES IT COMMUNICATE?
 *   Other agents don't talk to the Planner over the internet.
 *   They use AXL — an encrypted peer-to-peer network (like
 *   Signal, but for AI agents). The Planner listens on port 9002.
 *
 * WHERE DOES IT RUN?
 *   On your own machine! You start it with `pnpm start:agents`.
 *   It keeps running in the background and writes logs to logs/planner.log.
 *
 * CAN I CUSTOMIZE IT?
 *   Yes! Override any value below by adding it to your .env file.
 *   For example: PLANNER_AXL_API_PORT=9005
 *   (Useful if port 9002 is taken by another app on your computer.)
 */
export const config = {
  // ── Identity ──────────────────────────────────────────────────────────────
  // The planner's name on the Ethereum Name Service (ENS).
  // Other agents look up "planner.neuralmesh.eth" to find this agent.
  // WHY ENS? Same reason humans use domain names instead of IP addresses —
  // it's memorable and the address can change without breaking discovery.
  // TO CUSTOMIZE: Set PLANNER_ENS in .env (e.g., "myplanner.eth")
  ensName: process.env['PLANNER_ENS'] ?? 'planner.neuralmesh.eth',

  // ── AXL P2P Network Ports ─────────────────────────────────────────────────
  // axlApiPort: The HTTP port YOUR CODE uses to talk to AXL.
  //   When you send a task, your app calls http://localhost:9002/api/send.
  //   This is the "front door" that you interact with.
  // axlTcpPort: The internal port AXL uses to talk to OTHER AXL nodes.
  //   You never touch this directly — AXL manages it automatically.
  //   It's like the difference between a restaurant's front door (api)
  //   and the kitchen's delivery entrance (tcp).
  axlApiPort: parseInt(process.env['PLANNER_AXL_API_PORT'] ?? '9002', 10),
  axlTcpPort: parseInt(process.env['PLANNER_AXL_TCP_PORT'] ?? '7000', 10),

  // ── AXL Identity Key ──────────────────────────────────────────────────────
  // Every agent has a unique cryptographic key — like a passport for the P2P
  // network. This key proves "I am the real Planner" to other agents.
  // HOW TO GENERATE: Run `pnpm keys` — it creates this file automatically.
  // WHY A FILE (not an env var)? Keys are long and binary — files are safer.
  axlKeyPath: process.env['PLANNER_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/planner.pem',

  // ── AI Model ──────────────────────────────────────────────────────────────
  // Which AI model the Planner uses to think and make decisions.
  // GLM-5-FP8 is a fast, capable model good at decomposing complex goals
  // into clear subtasks. It runs via 0G Compute (no local GPU needed).
  // TO USE A DIFFERENT MODEL: Change this string (check 0G Compute docs for options).
  model: 'GLM-5-FP8',

  // ── Capabilities (what this agent advertises it can do) ───────────────────
  // When the Planner registers on ENS, it tells the network these are its skills.
  // Other agents (or your app) can search ENS for "who can plan?" and find this.
  //   plan       — receive a high-level goal and turn it into a task list
  //   decompose  — break complex goals into atomic, delegatable subtasks
  //   coordinate — manage multiple agents working in parallel on a single goal
  capabilities: ['plan', 'decompose', 'coordinate'],
}
