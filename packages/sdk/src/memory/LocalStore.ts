import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function getStoreDir(agentName: string): string {
  const base = join(homedir(), '.neuralmesh', safeFilename(agentName))
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  return base
}

function safeFilename(key: string): string {
  return key.replace(/[:<>"/\\|?*]/g, '_')
}

export class LocalStore {
  private dir: string

  constructor(private agentName: string) {
    this.dir = getStoreDir(agentName)
  }

  get(key: string): unknown {
    const file = join(this.dir, `${safeFilename(key)}.json`)
    if (!existsSync(file)) return null
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as unknown
    } catch {
      return null
    }
  }

  set(key: string, value: unknown): void {
    writeFileSync(join(this.dir, `${safeFilename(key)}.json`), JSON.stringify(value, null, 2))
  }

  append(category: string, record: unknown): void {
    const file = join(this.dir, `${safeFilename(category)}.jsonl`)
    appendFileSync(file, JSON.stringify(record) + '\n')
  }

  tail(category: string, n: number): unknown[] {
    const file = join(this.dir, `${safeFilename(category)}.jsonl`)
    if (!existsSync(file)) return []
    try {
      const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
      return lines.slice(-n).map((l) => {
        try { return JSON.parse(l) as unknown } catch { return l }
      })
    } catch {
      return []
    }
  }
}
