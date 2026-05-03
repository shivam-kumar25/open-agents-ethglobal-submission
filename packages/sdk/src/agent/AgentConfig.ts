export interface NeuralMeshConfig {
  /** ENS name, e.g. "researcher.neuralmesh.eth" */
  name: string
  /** e.g. ["research", "analyze"] */
  capabilities: string[]
  /** AI model identifier (passed to TokenRouter) */
  model: string
  /** Enable evolution loop (default: false) */
  evolve?: boolean
  /** HTTP port for AXL API (e.g. 9002) */
  axlApiPort: number
  /** Path to ed25519 PEM key for AXL */
  axlKeyPath: string
  /** Wallet private key (hex, 0x-prefixed or raw 32 bytes hex) */
  privateKey: string
  /** Sepolia RPC URL (ENS always resolves from Sepolia) */
  sepoliaRpcUrl: string
  /** TokenRouter API key */
  tokenrouterApiKey?: string
  /** TokenRouter base URL (default: https://api.tokenrouter.com/v1) */
  tokenrouterBaseUrl?: string
  /** KeeperHub API key */
  keeperhubApiKey?: string
  /** Number of tasks before triggering evolution (default: 50) */
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
