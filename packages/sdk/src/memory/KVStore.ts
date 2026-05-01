import { createPublicClient, http, type WalletClient } from 'viem'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient } from 'viem'

// Using 0g-ts-sdk for storage operations
// KV reads: kvNodeUrl (--node endpoint)
// File writes: indexerUrl (--indexer endpoint)
export class KVStore {
  private namespace_prefix: string

  constructor(
    private kvNodeUrl: string,
    private indexerUrl: string,
    private privateKey: string,
    private agentName: string,
  ) {
    this.namespace_prefix = `neuralmesh:${agentName}:`
  }

  private ns(key: string): string {
    return `${this.namespace_prefix}${key}`
  }

  async get(key: string): Promise<unknown> {
    const namespacedKey = this.ns(key)
    try {
      const res = await fetch(`${this.kvNodeUrl}/kv/${encodeURIComponent(namespacedKey)}`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`KV get failed: ${res.status}`)
      const text = await res.text()
      return JSON.parse(text) as unknown
    } catch (err) {
      // Return null on not-found, rethrow other errors
      if (err instanceof Error && err.message.includes('404')) return null
      console.error(`[KVStore] get "${key}" failed:`, err)
      return null
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const namespacedKey = this.ns(key)
    const body = JSON.stringify(value)
    const res = await fetch(`${this.indexerUrl}/kv/${encodeURIComponent(namespacedKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) throw new Error(`KV set failed: ${res.status} ${await res.text()}`)
  }

  async delete(key: string): Promise<void> {
    const namespacedKey = this.ns(key)
    const res = await fetch(`${this.indexerUrl}/kv/${encodeURIComponent(namespacedKey)}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 404) {
      throw new Error(`KV delete failed: ${res.status}`)
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    const searchPrefix = prefix ? this.ns(prefix) : this.namespace_prefix
    const res = await fetch(`${this.kvNodeUrl}/kv/keys?prefix=${encodeURIComponent(searchPrefix)}`)
    if (!res.ok) return []
    const data = await res.json() as { keys?: string[] }
    return (data.keys ?? []).map((k) => k.replace(this.namespace_prefix, ''))
  }
}
