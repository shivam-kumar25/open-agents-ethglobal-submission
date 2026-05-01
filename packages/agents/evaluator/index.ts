import 'dotenv/config'
import { ENSResolver } from '@neuralmesh/sdk'
import { createBaseAgent } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { startEvaluator } from './evaluator.js'

async function main() {
  console.log('[evaluator] Starting NeuralMesh Evaluator agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
  })
  // ENSResolver is used to write reputation scores onchain after each evaluation.
  // If SEPOLIA_RPC_URL is missing, ENS writes are skipped (degraded mode).
  const sepoliaRpc = process.env['SEPOLIA_RPC_URL'] ?? 'https://rpc.sepolia.org'
  const ens = new ENSResolver(sepoliaRpc)
  console.log(`[evaluator] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  await startEvaluator(agent, ens)
}

main().catch((err) => {
  console.error('[evaluator] Fatal error:', err)
  process.exit(1)
})
