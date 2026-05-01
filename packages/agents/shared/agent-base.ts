import 'dotenv/config'
import { NeuralMesh } from '@neuralmesh/sdk'
import type { NeuralMeshConfig, Agent } from '@neuralmesh/sdk'

export async function createBaseAgent(
  overrides: Partial<NeuralMeshConfig> & {
    name: string
    axlApiPort: number
    axlKeyPath: string
  },
): Promise<Agent> {
  return NeuralMesh.create({
    privateKey: process.env['PRIVATE_KEY']!,
    zgRpcUrl: process.env['ZG_RPC_URL']!,
    sepoliaRpcUrl: process.env['SEPOLIA_RPC_URL']!,
    zgStorageNodeUrl: process.env['ZG_STORAGE_NODE_URL']!,
    zgStorageKvNodeUrl: process.env['ZG_STORAGE_KV_NODE_URL']!,
    zgComputeProvider: process.env['ZG_COMPUTE_PROVIDER'],
    zgApiKey: process.env['ZG_API_KEY'],
    zgFinetuneProvider: process.env['ZG_FINETUNE_PROVIDER'],
    inftContract: process.env['INFT_CONTRACT']!,
    registryContract: process.env['NEURALMESH_REGISTRY']!,
    keeperhubApiKey: process.env['KEEPERHUB_API_KEY'],
    capabilities: [],
    model: 'qwen/qwen-2.5-7b-instruct',
    ...overrides,
  })
}
