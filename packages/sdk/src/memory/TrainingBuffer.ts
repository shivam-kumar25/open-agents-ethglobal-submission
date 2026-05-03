import { LocalStore } from './LocalStore.js'

export interface TrainingExample {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}

export class TrainingBuffer {
  private count = 0
  private store: LocalStore

  constructor(
    agentName: string,
    private threshold: number,
    private onThresholdReached: () => void,
  ) {
    this.store = new LocalStore(agentName)
    const saved = this.store.get('training-count')
    if (typeof saved === 'number') this.count = saved
  }

  add(example: TrainingExample): void {
    this.store.append('training', example)
    this.count++
    this.store.set('training-count', this.count)
    if (this.count >= this.threshold) {
      this.onThresholdReached()
    }
  }

  getCount(): number {
    return this.count
  }

  reset(): void {
    this.count = 0
    this.store.set('training-count', 0)
  }
}
