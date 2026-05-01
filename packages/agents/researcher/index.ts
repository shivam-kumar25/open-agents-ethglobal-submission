import 'dotenv/config'
import { createBaseAgent } from '../shared/agent-base.js'
import { config } from './config.js'
import { startResearcher } from './researcher.js'

async function main() {
  console.log('[researcher] Starting NeuralMesh Researcher agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
    evolve: config.evolve,
    evolutionThreshold: config.evolutionThreshold,
    zgFinetuneProvider: process.env['ZG_FINETUNE_PROVIDER'],
  })
  console.log(`[researcher] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  console.log(`[researcher] iNFT: tokenId=${agent.getState().inftTokenId}`)
  console.log(`[researcher] Evolution threshold: ${config.evolutionThreshold} tasks`)
  await startResearcher(agent)
}

main().catch((err) => {
  console.error('[researcher] Fatal error:', err)
  process.exit(1)
})
