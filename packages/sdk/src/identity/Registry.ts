import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { namehash } from 'viem/ens'

const REGISTRY_ABI = [
  { name: 'registerAgent', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'wallet', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'ensNode', type: 'bytes32' }], outputs: [] },
  { name: 'recordTaskCompletion', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agent', type: 'address' }, { name: 'earnedWei', type: 'uint256' }], outputs: [] },
  { name: 'isRegistered', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ type: 'bool' }] },
  {
    name: 'getAgent', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ type: 'tuple', components: [{ name: 'inftTokenId', type: 'uint256' }, { name: 'ensNode', type: 'bytes32' }, { name: 'wallet', type: 'address' }, { name: 'active', type: 'bool' }, { name: 'taskCount', type: 'uint256' }, { name: 'totalEarned', type: 'uint256' }] }],
  },
] as const

export class Registry {
  private publicClient
  private walletClient
  private account

  constructor(
    private contractAddress: string,
    rpcUrl: string,
    privateKey: string,
  ) {
    const chain = { id: 16602, name: '0G Galileo', nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } } as const
    this.account = privateKeyToAccount(privateKey as `0x${string}`)
    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
    this.walletClient = createWalletClient({ account: this.account, chain, transport: http(rpcUrl) })
  }

  async registerAgent(wallet: string, tokenId: number, ensName: string): Promise<void> {
    const ensNode = namehash(ensName)
    await this.walletClient.writeContract({
      address: this.contractAddress as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'registerAgent',
      args: [wallet as `0x${string}`, BigInt(tokenId), ensNode],
    })
  }

  async recordTaskCompletion(agentWallet: string, earnedWei: bigint): Promise<void> {
    await this.walletClient.writeContract({
      address: this.contractAddress as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'recordTaskCompletion',
      args: [agentWallet as `0x${string}`, earnedWei],
    })
  }

  async isRegistered(wallet: string): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contractAddress as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'isRegistered',
      args: [wallet as `0x${string}`],
    }) as Promise<boolean>
  }

  async getAgent(wallet: string): Promise<{
    inftTokenId: number
    ensNode: string
    wallet: string
    active: boolean
    taskCount: number
    totalEarned: bigint
  }> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: 'getAgent',
      args: [wallet as `0x${string}`],
    }) as { inftTokenId: bigint; ensNode: `0x${string}`; wallet: `0x${string}`; active: boolean; taskCount: bigint; totalEarned: bigint }
    return {
      inftTokenId: Number(result.inftTokenId),
      ensNode: result.ensNode,
      wallet: result.wallet,
      active: result.active,
      taskCount: Number(result.taskCount),
      totalEarned: result.totalEarned,
    }
  }
}
