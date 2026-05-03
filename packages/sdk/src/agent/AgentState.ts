export interface AgentState {
  name: string
  axlPubkey: string
  version: string
  reputation: number
  taskCount: number
  earnings: string
  lastEvolution: number | null
}

export function defaultState(name: string): AgentState {
  return {
    name,
    axlPubkey: '',
    version: 'v1.0.0',
    reputation: 100,
    taskCount: 0,
    earnings: '0',
    lastEvolution: null,
  }
}
