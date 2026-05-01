export const config = {
  ensName: process.env['EXECUTOR_ENS'] ?? 'executor.neuralmesh.eth',
  axlApiPort: parseInt(process.env['EXECUTOR_AXL_API_PORT'] ?? '9022', 10),
  axlKeyPath: process.env['EXECUTOR_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/executor.pem',
  model: 'qwen/qwen-2.5-7b-instruct',
  capabilities: ['execute', 'simulate', 'audit'],
}
