export interface NeuralMeshConfig {
  /** ENS name, e.g. "researcher.neuralmesh.eth" */
  name: string
  /** e.g. ["research", "analyze"] */
  capabilities: string[]
  /** 0G Compute model identifier */
  model: string
  /** Enable evolution loop (default: false) */
  evolve?: boolean
  /** HTTP port for AXL API (e.g. 9002) */
  axlApiPort: number
  /** Path to ed25519 PEM key for AXL */
  axlKeyPath: string
  /** Wallet private key (hex, 0x-prefixed or raw 32 bytes hex) */
  privateKey: string
  /** 0G Chain RPC URL */
  zgRpcUrl: string
  /** Sepolia RPC URL (ENS always resolves from Sepolia on testnet) */
  sepoliaRpcUrl: string
  /** 0G Storage node URL — for file uploads (--indexer flag) */
  zgStorageNodeUrl: string
  /** 0G Storage KV node URL — for KV reads (--node flag, different endpoint!) */
  zgStorageKvNodeUrl: string
  /** 0G Compute provider address */
  zgComputeProvider?: string
  /** Alternative to broker SDK: API key with app-sk-... prefix */
  zgApiKey?: string
  /** 0G Fine-tuning provider address */
  zgFinetuneProvider?: string
  /** KeeperHub API key */
  keeperhubApiKey?: string
  /** ERC-7857 iNFT contract address on 0G Galileo */
  inftContract: string
  /** NeuralMeshRegistry contract address */
  registryContract: string
  /** Number of tasks before triggering fine-tuning (default: 50) */
  evolutionThreshold?: number
}

export interface AgentHandle {
  /** ENS name of the remote agent */
  name: string
  /** AXL pubkey of the remote agent */
  pubkey: string
  /** Call a service on the remote agent via AXL MCP protocol */
  call(service: string, args: Record<string, unknown>): Promise<unknown>
  /** Send a fire-and-forget message to the remote agent */
  send(payload: unknown): Promise<void>
}

export interface ServiceHandler {
  (
    args: Record<string, unknown>,
    meta: { from: string; taskId: string }
  ): Promise<unknown>
}
