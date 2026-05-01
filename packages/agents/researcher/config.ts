export const config = {
  ensName: process.env['RESEARCHER_ENS'] ?? 'researcher.neuralmesh.eth',
  axlApiPort: parseInt(process.env['RESEARCHER_AXL_API_PORT'] ?? '9012', 10),
  axlTcpPort: parseInt(process.env['RESEARCHER_AXL_TCP_PORT'] ?? '7001', 10),
  axlKeyPath: process.env['RESEARCHER_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/researcher.pem',
  model: 'qwen/qwen-2.5-7b-instruct',
  capabilities: ['research', 'analyze', 'synthesize'],
  evolve: true,
  evolutionThreshold: parseInt(process.env['EVOLUTION_TASK_THRESHOLD'] ?? '50', 10),
}
