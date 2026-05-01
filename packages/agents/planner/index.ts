import 'dotenv/config'
import { createBaseAgent } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { runPlannerLoop } from './planner.js'

async function main() {
  console.log('[planner] Starting NeuralMesh Planner agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
    evolve: false,
  })
  console.log(`[planner] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  console.log(`[planner] iNFT: tokenId=${agent.getState().inftTokenId}`)
  await runPlannerLoop(agent)
}

main().catch((err) => {
  console.error('[planner] Fatal error:', err)
  process.exit(1)
})
