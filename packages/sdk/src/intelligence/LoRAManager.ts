import { createHash } from 'node:crypto'
import { createPublicClient, createWalletClient, http, getContract, encodeAbiParameters, parseAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { LogStore } from '../memory/LogStore.js'

const INFT_ABI = [
  { name: 'metadataHash', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'encryptedURI', type: 'string' }, { name: 'metadataHash', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

export class LoRAManager {
  constructor(
    private logStore: LogStore,
    private inftAddress: string,
    private rpcUrl: string,
    private privateKey: string,
  ) {}

  async store(loraData: Uint8Array, version: string): Promise<string> {
    const filename = `lora-${version}-${Date.now()}.bin`
    const rootHash = await this.logStore.uploadFile(loraData, filename)
    console.log(`[LoRAManager] LoRA ${version} stored: ${rootHash}`)
    return rootHash
  }

  async updateiNFT(tokenId: number, loraRoot: string, metadataJson: object): Promise<string> {
    const account = privateKeyToAccount(this.privateKey as `0x${string}`)
    const chain = { id: 16602, name: '0G Galileo', nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 }, rpcUrls: { default: { http: [this.rpcUrl] } } } as const
    const walletClient = createWalletClient({ account, chain, transport: http(this.rpcUrl) })

    const metadataStr = JSON.stringify({ ...metadataJson, loraRoot })
    const metadataHash = `0x${createHash('sha256').update(metadataStr).digest('hex')}` as `0x${string}`
    const encryptedURI = Buffer.from(metadataStr).toString('base64')

    // Mint new iNFT with updated metadata (evolution = new token with updated hash)
    const hash = await walletClient.writeContract({
      address: this.inftAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'mint',
      args: [account.address, encryptedURI, metadataHash as `0x${string}`],
    })
    console.log(`[LoRAManager] iNFT updated with new LoRA root. Tx: ${hash}`)
    return hash
  }

  async verify(loraRoot: string): Promise<boolean> {
    if (!loraRoot) return false
    try {
      const res = await fetch(`${this.logStore['indexerUrl']}/file/exists/${loraRoot}`)
      return res.ok
    } catch {
      return false
    }
  }

  async load(loraRoot: string): Promise<Uint8Array> {
    return this.logStore.downloadFile(loraRoot)
  }

  static buildMetadataHash(metadata: object): string {
    return `0x${createHash('sha256').update(JSON.stringify(metadata)).digest('hex')}`
  }

  static buildEncryptedURI(metadata: object): string {
    return Buffer.from(JSON.stringify(metadata)).toString('base64')
  }
}
