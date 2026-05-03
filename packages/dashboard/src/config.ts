export const AGENTS = [
  { name: 'planner', ensName: 'planner.neuralmesh.eth', axlApiPath: '/axl-planner', port: 9002, evolves: false },
  { name: 'researcher', ensName: 'researcher.neuralmesh.eth', axlApiPath: '/axl-researcher', port: 9012, evolves: true },
  { name: 'executor', ensName: 'executor.neuralmesh.eth', axlApiPath: '/axl-executor', port: 9022, evolves: false },
  { name: 'evaluator', ensName: 'evaluator.neuralmesh.eth', axlApiPath: '/axl-evaluator', port: 9032, evolves: false },
  { name: 'evolution', ensName: 'evolution.neuralmesh.eth', axlApiPath: '/axl-evolution', port: 9042, evolves: false },
] as const

export const SEPOLIA_RPC = import.meta.env['VITE_SEPOLIA_RPC_URL'] as string ?? 'https://ethereum-sepolia-rpc.publicnode.com'
export const EVOLUTION_THRESHOLD = parseInt(import.meta.env['VITE_EVOLUTION_THRESHOLD'] as string ?? '50', 10)
export const ENS_APP = 'https://app.ens.domains'
export const SEPOLIA_ETHERSCAN = 'https://sepolia.etherscan.io'
