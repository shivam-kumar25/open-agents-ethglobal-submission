import { createPublicClient, createWalletClient, http, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { normalize, namehash } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

const ENS_PUBLIC_RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5' as const

const ENS_RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export interface AgentENSRecords {
  address: string | null
  axlPubkey: string
  services: string[]
  version: string
  reputation: number
  tasks: number
  model: string
  baseModel: string
  url: string
}

export class ENSResolver {
  private client: ReturnType<typeof createPublicClient>

  constructor(private sepoliaRpcUrl: string) {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(sepoliaRpcUrl),
    })
  }

  async resolve(ensName: string): Promise<AgentENSRecords> {
    const [address, axlPubkey, services, version, reputation, tasks, model, baseModel, url] =
      await Promise.all([
        this.getAddress(ensName),
        this.getText(ensName, 'axl-pubkey'),
        this.getText(ensName, 'axl-services'),
        this.getText(ensName, 'neural-version'),
        this.getText(ensName, 'neural-reputation'),
        this.getText(ensName, 'neural-tasks'),
        this.getText(ensName, 'neural-model'),
        this.getText(ensName, 'neural-base-model'),
        this.getText(ensName, 'url'),
      ])

    return {
      address,
      axlPubkey: axlPubkey ?? '',
      services: services ? services.split(',').map((s) => s.trim()) : [],
      version: version ?? 'v1.0.0',
      reputation: reputation ? parseInt(reputation, 10) : 100,
      tasks: tasks ? parseInt(tasks, 10) : 0,
      model: model ?? '',
      baseModel: baseModel ?? '',
      url: url ?? '',
    }
  }

  async getText(ensName: string, key: string): Promise<string | null> {
    try {
      const result = await this.client.getEnsText({
        name: normalize(ensName),
        key,
      })
      return result ?? null
    } catch {
      return null
    }
  }

  async getAddress(ensName: string): Promise<string | null> {
    try {
      const result = await this.client.getEnsAddress({
        name: normalize(ensName),
      })
      return result ?? null
    } catch {
      return null
    }
  }

  async setText(
    ensName: string,
    key: string,
    value: string,
    signerKey: string,
  ): Promise<string> {
    const account = privateKeyToAccount(signerKey as Hex)
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(this.sepoliaRpcUrl),
    })
    const node = namehash(normalize(ensName))
    return walletClient.writeContract({
      address: ENS_PUBLIC_RESOLVER,
      abi: ENS_RESOLVER_ABI,
      functionName: 'setText',
      args: [node, key, value],
      account,
    })
  }

  async getAgentRecords(ensName: string): Promise<Record<string, string>> {
    const keys = [
      'axl-pubkey', 'axl-services', 'neural-version', 'neural-reputation',
      'neural-tasks', 'neural-model', 'neural-base-model', 'url',
    ]
    const results = await Promise.all(keys.map((k) => this.getText(ensName, k)))
    const out: Record<string, string> = {}
    for (let i = 0; i < keys.length; i++) {
      const v = results[i]
      if (v !== null && v !== undefined) out[keys[i]!] = v
    }
    return out
  }
}
