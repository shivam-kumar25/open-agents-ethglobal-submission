export interface TaskRequest {
  taskId: string
  type: 'research' | 'execute' | 'evaluate' | 'evolve'
  payload: unknown
  requesterId: string
  requesterPubkey: string
  timestamp: number
}

export interface TaskResult {
  taskId: string
  success: boolean
  result: unknown
  agentName: string
  processingTimeMs: number
  timestamp: number
}

export interface EvaluationScore {
  taskId: string
  targetAgent: string
  score: number
  breakdown: { accuracy: number; speed: number; relevance: number }
  evaluatorName: string
  timestamp: number
}

export interface EvolutionAnnouncement {
  agentName: string
  fromVersion: string
  toVersion: string
  timestamp: number
}
