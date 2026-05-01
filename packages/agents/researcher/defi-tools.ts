export async function getAaveYields(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      'https://aave-api-v2.aave.com/data/rates-history?reserveId=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&from=1700000000&resolutionInHours=24',
      { signal: AbortSignal.timeout(5_000) },
    )
    if (!res.ok) return { USDC: 4.2, ETH: 2.1, WBTC: 1.8 }
    const data = await res.json() as Array<{ liquidityRate_avg?: number }>
    const latest = data[data.length - 1]
    return { USDC: (latest?.liquidityRate_avg ?? 0.042) * 100, ETH: 2.1, WBTC: 1.8 }
  } catch {
    return { USDC: 4.2, ETH: 2.1, WBTC: 1.8 }
  }
}

export async function getProtocolTVL(protocol: string): Promise<number> {
  try {
    const slug = protocol.toLowerCase().replace(/\s+/g, '-')
    const res = await fetch(`https://api.llama.fi/tvl/${slug}`, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return 0
    const num = await res.json() as number
    return typeof num === 'number' ? num : 0
  } catch {
    return 0
  }
}

export async function getTokenPrice(symbol: string): Promise<number> {
  try {
    const id = symbol.toLowerCase() === 'eth' ? 'ethereum'
      : symbol.toLowerCase() === 'btc' ? 'bitcoin'
      : symbol.toLowerCase()
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5_000) },
    )
    if (!res.ok) return 0
    const data = await res.json() as Record<string, { usd?: number }>
    return data[id]?.usd ?? 0
  } catch {
    return 0
  }
}

export async function getUniswapPools(token: string): Promise<Array<{ pool: string; apr: number; tvl: number }>> {
  // DeFiLlama yields API for Uniswap pools
  try {
    const res = await fetch('https://yields.llama.fi/pools', { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return []
    const data = await res.json() as { data?: Array<{ project?: string; symbol?: string; apy?: number; tvlUsd?: number; pool?: string }> }
    return (data.data ?? [])
      .filter((p) => p.project === 'uniswap-v3' && p.symbol?.toLowerCase().includes(token.toLowerCase()))
      .slice(0, 5)
      .map((p) => ({ pool: p.pool ?? '', apr: p.apy ?? 0, tvl: p.tvlUsd ?? 0 }))
  } catch {
    return []
  }
}
