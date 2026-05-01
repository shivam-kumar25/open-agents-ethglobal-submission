import { createPublicClient, http, type PublicClient } from 'viem'
import { sepolia } from 'viem/chains'
import { getTextRecord, getAddressRecord, setTextRecord } from '@ensdomains/ensjs/public'
import { createWalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

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
  private client: PublicClient

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
      const result = await getTextRecord(this.client, { name: ensName, key })
      return result ?? null
    } catch {
      return null
    }
  }

  async getAddress(ensName: string): Promise<string | null> {
    try {
      const result = await getAddressRecord(this.client, { name: ensName })
      return result?.value ?? null
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
    const account = privateKeyToAccount(signerKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(this.sepoliaRpcUrl),
    })
    const hash = await setTextRecord(walletClient, {
      name: ensName,
      key,
      value,
      account,
    })
    return hash
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
      if (v !== null) out[keys[i]!] = v
    }
    return out
  }
}
