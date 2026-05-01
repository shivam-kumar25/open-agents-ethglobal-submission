import 'dotenv/config'
import { NeuralMesh, checkCapabilities, printStartupBanner } from '@neuralmesh/sdk'
import type { NeuralMeshConfig, Agent } from '@neuralmesh/sdk'

/**
 * createBaseAgent — shared startup logic for all 5 NeuralMesh agents.
 *
 * What this does:
 *   1. Checks which capabilities are available (based on env vars in .env)
 *   2. Prints a friendly startup banner showing what's ready and what's missing
 *   3. Starts the agent with whatever is available — never crashes on missing keys
 *
 * Why not crash on missing keys?
 *   We want agents to be usable even with partial configuration.
 *   If you only have SEPOLIA_RPC_URL, you can still see agents discover each other.
 *   Each missing capability shows a clear message about what to add.
 *
 * What are the `overrides`?
 *   Each agent (planner, researcher, etc.) passes its own name, ports, and capabilities.
 *   This function fills in the rest from .env variables.
 */
export async function createBaseAgent(
  overrides: Partial<NeuralMeshConfig> & {
    name: string
    axlApiPort: number
    axlKeyPath: string
  },
): Promise<Agent> {
  // Step 1: Check what's available
  const report = checkCapabilities()

  // Step 2: Print the startup banner (shows green/red for each capability)
  printStartupBanner(overrides.name, report)

  // Step 3: Build required fields first (exactOptionalPropertyTypes: optional fields
  // cannot be assigned string | undefined — they must be set conditionally)
  const config: NeuralMeshConfig = {
    name: overrides.name,
    axlApiPort: overrides.axlApiPort,
    axlKeyPath: overrides.axlKeyPath,
    capabilities: overrides.capabilities ?? [],
    model: overrides.model ?? 'qwen/qwen-2.5-7b-instruct',

    // Wallet (needed for iNFT and ENS writes)
    privateKey: overrides.privateKey ?? process.env['PRIVATE_KEY'] ?? '',
    zgRpcUrl: overrides.zgRpcUrl ?? process.env['ZG_RPC_URL'] ?? 'https://evmrpc-testnet.0g.ai',

    // ENS discovery (needed to find other agents by name)
    sepoliaRpcUrl: overrides.sepoliaRpcUrl ?? process.env['SEPOLIA_RPC_URL'] ?? 'https://rpc.sepolia.org',

    // 0G Storage (needed for persistent memory)
    zgStorageNodeUrl: overrides.zgStorageNodeUrl ?? process.env['ZG_STORAGE_NODE_URL'] ?? '',
    zgStorageKvNodeUrl: overrides.zgStorageKvNodeUrl ?? process.env['ZG_STORAGE_KV_NODE_URL'] ?? '',

    // Contract addresses
    inftContract: overrides.inftContract ?? process.env['INFT_CONTRACT'] ?? '0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F',
    registryContract: overrides.registryContract ?? process.env['NEURALMESH_REGISTRY'] ?? '',
  }

  // Step 4: Add optional fields only when defined.
  // With exactOptionalPropertyTypes: true, you cannot write `field: undefined` for
  // an optional field — you must either set it to a real value or omit it entirely.
  const zgComputeProvider = overrides.zgComputeProvider ?? process.env['ZG_COMPUTE_PROVIDER']
  if (zgComputeProvider !== undefined) config.zgComputeProvider = zgComputeProvider

  const zgApiKey = overrides.zgApiKey ?? process.env['ZG_COMPUTE_API_KEY'] ?? process.env['ZG_API_KEY']
  if (zgApiKey !== undefined) config.zgApiKey = zgApiKey

  const zgFinetuneProvider = overrides.zgFinetuneProvider ?? process.env['ZG_FINETUNE_PROVIDER']
  if (zgFinetuneProvider !== undefined) config.zgFinetuneProvider = zgFinetuneProvider

  const keeperhubApiKey = overrides.keeperhubApiKey ?? process.env['KEEPERHUB_API_KEY']
  if (keeperhubApiKey !== undefined) config.keeperhubApiKey = keeperhubApiKey

  if (overrides.evolve !== undefined) config.evolve = overrides.evolve
  if (overrides.evolutionThreshold !== undefined) config.evolutionThreshold = overrides.evolutionThreshold

  return NeuralMesh.create(config)
}
