export const AGENTS = [
  { name: 'planner', ensName: 'planner.neuralmesh.eth', axlApiPath: '/axl-planner', port: 9002, evolves: false },
  { name: 'researcher', ensName: 'researcher.neuralmesh.eth', axlApiPath: '/axl-researcher', port: 9012, evolves: true },
  { name: 'executor', ensName: 'executor.neuralmesh.eth', axlApiPath: '/axl-executor', port: 9022, evolves: false },
  { name: 'evaluator', ensName: 'evaluator.neuralmesh.eth', axlApiPath: '/axl-evaluator', port: 9032, evolves: false },
  { name: 'evolution', ensName: 'evolution.neuralmesh.eth', axlApiPath: '/axl-evolution', port: 9042, evolves: false },
] as const

export const SEPOLIA_RPC = import.meta.env['VITE_SEPOLIA_RPC_URL'] as string ?? 'https://rpc.sepolia.org'
export const ZG_RPC = import.meta.env['VITE_ZG_RPC_URL'] as string ?? 'https://evmrpc-testnet.0g.ai'
export const INFT_CONTRACT = import.meta.env['VITE_INFT_CONTRACT'] as string ?? '0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F'
export const ZG_STORAGE_KV_URL = import.meta.env['VITE_ZG_STORAGE_KV_NODE_URL'] as string ?? ''
export const NEURALMESH_REGISTRY = import.meta.env['VITE_NEURALMESH_REGISTRY'] as string ?? ''
export const EVOLUTION_THRESHOLD = parseInt(import.meta.env['VITE_EVOLUTION_THRESHOLD'] as string ?? '50', 10)
export const ZG_EXPLORER = 'https://chainscan-galileo.0g.ai'
export const ZG_STORAGE_EXPLORER = 'https://storagescan-galileo.0g.ai'
export const ENS_APP = 'https://app.ens.domains'
