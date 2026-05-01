export const config = {
  ensName: process.env['PLANNER_ENS'] ?? 'planner.neuralmesh.eth',
  axlApiPort: parseInt(process.env['PLANNER_AXL_API_PORT'] ?? '9002', 10),
  axlTcpPort: parseInt(process.env['PLANNER_AXL_TCP_PORT'] ?? '7000', 10),
  axlKeyPath: process.env['PLANNER_AXL_KEY_PATH'] ?? './packages/agents/shared/axl-keys/planner.pem',
  model: 'GLM-5-FP8',
  capabilities: ['plan', 'decompose', 'coordinate'],
}
