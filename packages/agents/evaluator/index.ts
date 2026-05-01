import 'dotenv/config'
import { ENSResolver } from '@neuralmesh/sdk'
import { createBaseAgent } from '../shared/agent-base.js'
import { config } from './config.js'
import { startEvaluator } from './evaluator.js'

async function main() {
  console.log('[evaluator] Starting NeuralMesh Evaluator agent...')
  const agent = await createAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
  })
  const ens = new ENSResolver(process.env['SEPOLIA_RPC_URL']!)
  console.log(`[evaluator] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  await startEvaluator(agent, ens)
}

main().catch((err) => {
  console.error('[evaluator] Fatal error:', err)
  process.exit(1)
})
