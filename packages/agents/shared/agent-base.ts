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

  // Step 3: Build config — use empty strings for missing values so agents
  //         start in degraded mode instead of crashing
  const config: NeuralMeshConfig = {
    // Wallet (needed for iNFT and ENS writes)
    privateKey: process.env['PRIVATE_KEY'] ?? '',
    zgRpcUrl: process.env['ZG_RPC_URL'] ?? 'https://evmrpc-testnet.0g.ai',

    // ENS discovery (needed to find other agents by name)
    sepoliaRpcUrl: process.env['SEPOLIA_RPC_URL'] ?? 'https://rpc.sepolia.org',

    // 0G Storage (needed for persistent memory)
    zgStorageNodeUrl: process.env['ZG_STORAGE_NODE_URL'] ?? '',
    zgStorageKvNodeUrl: process.env['ZG_STORAGE_KV_NODE_URL'] ?? '',

    // 0G Compute (needed for AI inference)
    zgComputeProvider: process.env['ZG_COMPUTE_PROVIDER'],
    zgApiKey: process.env['ZG_COMPUTE_API_KEY'] ?? process.env['ZG_API_KEY'],

    // 0G Fine-tuning (needed for evolution loop)
    zgFinetuneProvider: process.env['ZG_FINETUNE_PROVIDER'],

    // Contract addresses
    inftContract: process.env['INFT_CONTRACT'] ?? '0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F',
    registryContract: process.env['NEURALMESH_REGISTRY'] ?? '',

    // KeeperHub (needed for automated workflows and micropayments)
    keeperhubApiKey: process.env['KEEPERHUB_API_KEY'],

    // Defaults (each agent overrides these)
    capabilities: [],
    model: 'qwen/qwen-2.5-7b-instruct',

    // Agent-specific overrides (name, port, key path, etc.)
    ...overrides,
  }

  return NeuralMesh.create(config)
}
