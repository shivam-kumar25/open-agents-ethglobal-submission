import { createWriteStream, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export class LogStore {
  private localBuffer = new Map<string, string[]>()

  constructor(
    private indexerUrl: string,
    private privateKey: string,
    private agentName: string,
  ) {}

  async append(category: string, record: unknown): Promise<string> {
    const line = JSON.stringify(record)
    if (!this.localBuffer.has(category)) this.localBuffer.set(category, [])
    this.localBuffer.get(category)!.push(line)

    // Upload to 0G Storage every 10 records (or on flush)
    const buf = this.localBuffer.get(category)!
    if (buf.length >= 10) {
      return await this.flush(category)
    }
    return ''
  }

  private async flush(category: string): Promise<string> {
    const buf = this.localBuffer.get(category)
    if (!buf || buf.length === 0) return ''

    const content = buf.join('\n') + '\n'
    const rootHash = await this.uploadFile(content, `${this.agentName}-${category}.jsonl`)
    this.localBuffer.set(category, [])
    return rootHash
  }

  async tail(category: string, n: number): Promise<unknown[]> {
    const buf = this.localBuffer.get(category) ?? []
    const last = buf.slice(-n)
    return last.map((line) => {
      try { return JSON.parse(line) as unknown }
      catch { return line }
    })
  }

  async uploadFile(content: string | Uint8Array, filename: string): Promise<string> {
    const body = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
    try {
      const res = await fetch(`${this.indexerUrl}/file/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Filename': filename,
        },
        body,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`)
      const data = await res.json() as { root?: string; rootHash?: string }
      return data.root ?? data.rootHash ?? ''
    } catch (err) {
      console.error('[LogStore] uploadFile error:', err)
      return ''
    }
  }

  async downloadFile(rootHash: string): Promise<Uint8Array> {
    const res = await fetch(`${this.indexerUrl}/file/download/${rootHash}`)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }

  async flushAll(): Promise<void> {
    for (const category of this.localBuffer.keys()) {
      await this.flush(category)
    }
  }
}
