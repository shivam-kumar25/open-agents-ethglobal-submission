export const config = {
  ensName: process.env['EVALUATOR_ENS'] ?? 'evaluator.neuralmesh.eth',
  axlApiPort: parseInt(process.env['EVALUATOR_AXL_API_PORT'] ?? '9032', 10),
  axlKeyPath: process.env['EVALUATOR_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/evaluator.pem',
  model: 'qwen/qwen-2.5-7b-instruct',
  capabilities: ['evaluate', 'score', 'rank'],
}
