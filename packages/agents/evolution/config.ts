/**
 * Evolution Agent — Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  WHAT IS THE EVOLUTION AGENT?                               │
 * │                                                             │
 * │  The Evolution agent is the "version manager".              │
 * │  It watches all other agents and coordinates version bumps  │
 * │  when task thresholds are crossed.                          │
 * │                                                             │
 * │  When the researcher completes enough tasks, the evolution  │
 * │  agent:                                                     │
 * │    1. Notifies KeeperHub to trigger the evolution workflow  │
 * │    2. Bumps the ENS neural-version text record              │
 * │    3. Broadcasts the new version to all agents via AXL      │
 * │                                                             │
 * │  The ENS version record is the on-chain proof of upgrade.   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WHAT DO YOU NEED TO ENABLE EVOLUTION?
 *   - PRIVATE_KEY in .env (to sign ENS version text record updates)
 *   - SEPOLIA_RPC_URL in .env (Ethereum Sepolia for ENS)
 *   - KEEPERHUB_API_KEY in .env (to trigger the evolution workflow)
 *   Without these, evolution is silently skipped — agents still work.
 *
 * WHERE DOES IT RUN?
 *   Locally on your machine, port 9042. Logs: logs/evolution.log
 */
export const config = {
  ensName: process.env['EVOLUTION_ENS'] ?? 'evolution.neuralmesh.eth',
  axlApiPort: parseInt(process.env['EVOLUTION_AXL_API_PORT'] ?? '9042', 10),
  axlKeyPath: process.env['EVOLUTION_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/evolution.pem',
  model: process.env['TOKENROUTER_MODEL'] ?? 'meta-llama/Llama-3.1-8B-Instruct',
  capabilities: ['evolve', 'monitor', 'upgrade'],
}
