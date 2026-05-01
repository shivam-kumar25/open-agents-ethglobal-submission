export class AgenticWallet {
  private baseUrl = 'https://api.keeperhub.io'
  private spendingCapUsdc: number

  constructor(private config: { walletAddress: string; apiKey: string; spendingCapUsdc?: number }) {
    this.spendingCapUsdc = config.spendingCapUsdc ?? 10
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    }
  }

  async pay(recipient: string, amountUsdc: string, memo: string): Promise<string> {
    const amount = parseFloat(amountUsdc)
    if (amount > this.spendingCapUsdc) {
      throw new Error(`Payment ${amountUsdc} USDC exceeds spending cap ${this.spendingCapUsdc} USDC`)
    }
    const res = await fetch(`${this.baseUrl}/wallet/pay`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        from: this.config.walletAddress,
        to: recipient,
        amountUsdc,
        memo,
        protocol: 'x402',
      }),
    })
    if (!res.ok) throw new Error(`Payment failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as { txHash?: string }
    return data.txHash ?? ''
  }

  async balance(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/wallet/${this.config.walletAddress}/balance`, {
      headers: this.headers,
    })
    if (!res.ok) return '0'
    const data = await res.json() as { usdc?: string; balance?: string }
    return data.usdc ?? data.balance ?? '0'
  }

  async history(): Promise<Array<{ to: string; amount: string; memo: string; txHash: string; ts: number }>> {
    const res = await fetch(`${this.baseUrl}/wallet/${this.config.walletAddress}/history`, {
      headers: this.headers,
    })
    if (!res.ok) return []
    const data = await res.json() as { transactions?: Array<{ to: string; amount: string; memo: string; txHash: string; ts: number }> }
    return data.transactions ?? []
  }
}
