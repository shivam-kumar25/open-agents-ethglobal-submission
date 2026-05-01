import 'dotenv/config'
import { createBaseAgent } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { startResearcher } from './researcher.js'

async function main() {
  console.log('[researcher] Starting NeuralMesh Researcher agent...')

  // Build the overrides object — optional fields must use conditional assignment
  // because exactOptionalPropertyTypes: true disallows `field: string | undefined`
  const overrides: Parameters<typeof createBaseAgent>[0] = {
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
    evolve: config.evolve,
    evolutionThreshold: config.evolutionThreshold,
  }
  const zgFinetuneProvider = process.env['ZG_FINETUNE_PROVIDER']
  if (zgFinetuneProvider !== undefined) overrides.zgFinetuneProvider = zgFinetuneProvider

  const agent = await createBaseAgent(overrides)
  console.log(`[researcher] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  console.log(`[researcher] iNFT: tokenId=${agent.getState().inftTokenId}`)
  console.log(`[researcher] Evolution threshold: ${config.evolutionThreshold} tasks`)
  await startResearcher(agent)
}

main().catch((err) => {
  console.error('[researcher] Fatal error:', err)
  process.exit(1)
})
