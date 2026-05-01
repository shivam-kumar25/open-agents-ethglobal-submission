import 'dotenv/config'
import { createBaseAgent } from '../shared/agent-base.js'
import { config } from './config.js'
import { startEvolution } from './evolution.js'

async function main() {
  console.log('[evolution] Starting NeuralMesh Evolution agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
  })
  console.log(`[evolution] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  await startEvolution(agent)
}

main().catch((err) => {
  console.error('[evolution] Fatal error:', err)
  process.exit(1)
})
