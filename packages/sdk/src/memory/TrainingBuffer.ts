import type { LogStore } from './LogStore.js'

export interface TrainingExample {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}

export class TrainingBuffer {
  private count = 0
  private buffer: TrainingExample[] = []

  constructor(
    private logStore: LogStore,
    private threshold: number,
    private onThresholdReached: () => void,
  ) {}

  async add(example: TrainingExample): Promise<void> {
    this.buffer.push(example)
    this.count++
    await this.logStore.append('training', example)
    if (this.count >= this.threshold) {
      this.onThresholdReached()
    }
  }

  getCount(): number {
    return this.count
  }

  async flush(): Promise<string> {
    const content = this.buffer.map((ex) => JSON.stringify(ex)).join('\n') + '\n'
    const rootHash = await this.logStore.uploadFile(content, `training-${Date.now()}.jsonl`)
    return rootHash
  }

  async reset(): Promise<void> {
    this.buffer = []
    this.count = 0
  }
}
