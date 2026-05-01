import 'dotenv/config'
import { createBaseAgent } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { startExecutor } from './executor.js'

async function main() {
  console.log('[executor] Starting NeuralMesh Executor agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
  })
  console.log(`[executor] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)
  await startExecutor(agent)
}

main().catch((err) => {
  console.error('[executor] Fatal error:', err)
  process.exit(1)
})
