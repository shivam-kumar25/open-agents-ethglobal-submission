export const config = {
  ensName: process.env['EVOLUTION_ENS'] ?? 'evolution.neuralmesh.eth',
  axlApiPort: parseInt(process.env['EVOLUTION_AXL_API_PORT'] ?? '9042', 10),
  axlKeyPath: process.env['EVOLUTION_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/evolution.pem',
  model: 'qwen/qwen-2.5-7b-instruct',
  capabilities: ['evolve', 'monitor', 'upgrade'],
}
