import { createPublicClient, createWalletClient, http, getContract } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createHash } from 'node:crypto'

const INFT_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'encryptedURI', type: 'string' }, { name: 'metadataHash', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'metadataHash', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'authorizeUsage', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'executor', type: 'address' }, { name: 'permissions', type: 'bytes' }], outputs: [] },
  { name: 'revokeAuthorization', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'executor', type: 'address' }], outputs: [] },
  { name: 'isAuthorized', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'executor', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'iTransferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'sealedKey', type: 'bytes' }, { name: 'proof', type: 'bytes' }], outputs: [] },
  {
    name: 'Transfer', type: 'event',
    inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'tokenId', type: 'uint256', indexed: true }],
  },
] as const

const GALILEO_CHAIN = {
  id: 16602,
  name: '0G Galileo',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
} as const

export class iNFTClient {
  private publicClient
  private walletClient
  private account

  constructor(
    private contractAddress: string,
    rpcUrl: string,
    privateKey: string,
  ) {
    const chain = { ...GALILEO_CHAIN, rpcUrls: { default: { http: [rpcUrl] } } }
    this.account = privateKeyToAccount(privateKey as `0x${string}`)
    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
    this.walletClient = createWalletClient({ account: this.account, chain, transport: http(rpcUrl) })
  }

  async mint(encryptedURI: string, metadataHash: string): Promise<number> {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'mint',
      args: [this.account.address, encryptedURI, metadataHash as `0x${string}`],
    })
    // Wait for receipt and parse tokenId from Transfer event
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
    for (const log of receipt.logs) {
      if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        const tokenId = parseInt(log.topics[3] ?? '0x0', 16)
        console.log(`[iNFT] Minted tokenId=${tokenId}`)
        return tokenId
      }
    }
    throw new Error('Could not find tokenId from mint receipt')
  }

  async getOwner(tokenId: number): Promise<string> {
    return this.publicClient.readContract({
      address: this.contractAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    }) as Promise<string>
  }

  async getMetadataHash(tokenId: number): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'metadataHash',
      args: [BigInt(tokenId)],
    })
    return result as string
  }

  async authorize(tokenId: number, executor: string, permissions: string): Promise<void> {
    const permsBytes = `0x${Buffer.from(permissions).toString('hex')}` as `0x${string}`
    await this.walletClient.writeContract({
      address: this.contractAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'authorizeUsage',
      args: [BigInt(tokenId), executor as `0x${string}`, permsBytes],
    })
  }

  async revoke(tokenId: number, executor: string): Promise<void> {
    await this.walletClient.writeContract({
      address: this.contractAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'revokeAuthorization',
      args: [BigInt(tokenId), executor as `0x${string}`],
    })
  }

  async isAuthorized(tokenId: number, executor: string): Promise<boolean> {
    try {
      return await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: INFT_ABI,
        functionName: 'isAuthorized',
        args: [BigInt(tokenId), executor as `0x${string}`],
      }) as boolean
    } catch {
      return false
    }
  }

  async transfer(tokenId: number, to: string, sealedKey: string, proof: string): Promise<void> {
    const skBytes = `0x${Buffer.from(sealedKey).toString('hex')}` as `0x${string}`
    const proofBytes = `0x${Buffer.from(proof).toString('hex')}` as `0x${string}`
    await this.walletClient.writeContract({
      address: this.contractAddress as `0x${string}`,
      abi: INFT_ABI,
      functionName: 'iTransferFrom',
      args: [this.account.address, to as `0x${string}`, BigInt(tokenId), skBytes, proofBytes],
    })
  }

  static buildMetadataHash(metadata: object): string {
    return `0x${createHash('sha256').update(JSON.stringify(metadata)).digest('hex')}`
  }

  static buildEncryptedURI(metadata: object): string {
    return Buffer.from(JSON.stringify(metadata)).toString('base64')
  }
}
