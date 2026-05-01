export interface AgentState {
  name: string
  inftTokenId: number | null
  axlPubkey: string
  version: string
  reputation: number
  taskCount: number
  earnings: string
  trainingExamples: number
  lastEvolution: number | null
}

export function defaultState(name: string): AgentState {
  return {
    name,
    inftTokenId: null,
    axlPubkey: '',
    version: 'v1.0.0',
    reputation: 100,
    taskCount: 0,
    earnings: '0',
    trainingExamples: 0,
    lastEvolution: null,
  }
}
