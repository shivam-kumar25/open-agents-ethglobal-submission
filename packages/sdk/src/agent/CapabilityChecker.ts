export interface Capabilities {
  axl: boolean
  ens: boolean
  compute: boolean
  storage: boolean
  keeperhub: boolean
  onchain: boolean
}

export interface CapabilityReport {
  capabilities: Capabilities
  missing: MissingCapability[]
  mode: 'full' | 'degraded' | 'offline'
  activeCount: number
}

export interface MissingCapability {
  tier: string
  service: string
  vars: string[]
  getItAt: string
  impact: string
}

export function checkCapabilities(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): CapabilityReport {
  const capabilities: Capabilities = {
    axl: true,
    ens: !!(env['SEPOLIA_RPC_URL']),
    compute: !!(env['ZG_SERVICE_URL'] && env['ZG_COMPUTE_API_KEY']),
    storage: !!(env['ZG_STORAGE_NODE_URL'] && env['ZG_STORAGE_KV_NODE_URL']),
    keeperhub: !!(env['KEEPERHUB_API_KEY']),
    onchain: !!(env['PRIVATE_KEY'] && env['ZG_RPC_URL']),
  }

  const missing: MissingCapability[] = []

  if (!capabilities.ens) {
    missing.push({
      tier: 'TIER 2',
      service: 'ENS Discovery',
      vars: ['SEPOLIA_RPC_URL'],
      getItAt: 'https://dashboard.alchemy.com (free)',
      impact: 'Agents use hardcoded pubkeys instead of ENS names',
    })
  }
  if (!capabilities.compute) {
    missing.push({
      tier: 'TIER 3',
      service: '0G Compute (AI inference)',
      vars: ['ZG_SERVICE_URL', 'ZG_COMPUTE_API_KEY'],
      getItAt: 'https://compute-marketplace.0g.ai',
      impact: 'think() returns "inference unavailable"',
    })
  }
  if (!capabilities.storage) {
    missing.push({
      tier: 'TIER 4',
      service: '0G Storage (memory)',
      vars: ['ZG_STORAGE_NODE_URL', 'ZG_STORAGE_KV_NODE_URL'],
      getItAt: 'https://0g.ai/storage',
      impact: 'Memory is in-process only (lost on restart)',
    })
  }
  if (!capabilities.keeperhub) {
    missing.push({
      tier: 'TIER 5',
      service: 'KeeperHub (onchain execution)',
      vars: ['KEEPERHUB_API_KEY'],
      getItAt: 'https://app.keeperhub.com/settings/api',
      impact: 'execute() throws — no blockchain actions',
    })
  }
  if (!capabilities.onchain) {
    missing.push({
      tier: 'TIER 6',
      service: '0G Chain / iNFT / Wallet',
      vars: ['PRIVATE_KEY', 'ZG_RPC_URL'],
      getItAt: 'https://faucet.0g.ai (get testnet tokens)',
      impact: 'No iNFT identity, no ENS writes, no USDC earnings',
    })
  }

  const activeCount = Object.values(capabilities).filter(Boolean).length
  const mode: CapabilityReport['mode'] =
    activeCount === 6 ? 'full' : activeCount >= 2 ? 'degraded' : 'offline'

  return { capabilities, missing, mode, activeCount }
}

export function printStartupBanner(agentName: string, report: CapabilityReport): void {
  const line = '═'.repeat(60)
  const thin = '─'.repeat(60)

  console.log(`\n╔${line}╗`)
  console.log(`║  NeuralMesh Agent${' '.repeat(60 - 18)}║`)
  console.log(`║  ${agentName.padEnd(58)}║`)
  console.log(`╠${line}╣`)

  console.log(`║                                                            ║`)
  console.log(`║  CAPABILITY REPORT                                         ║`)
  console.log(`║  ${thin.slice(0, 56)}  ║`)

  const cap = report.capabilities
  const row = (label: string, ok: boolean, note: string) => {
    const status = ok ? '✓' : '✗'
    const full = `  ${status}  ${label.padEnd(22)} ${note}`
    console.log(`║${full.padEnd(60)}║`)
  }

  row('AXL mesh (P2P)', cap.axl, 'always available')
  row('ENS discovery', cap.ens, cap.ens ? 'Sepolia connected' : 'SEPOLIA_RPC_URL missing')
  row('0G Compute (AI)', cap.compute, cap.compute ? 'inference ready' : 'ZG_COMPUTE_API_KEY missing')
  row('0G Storage (mem)', cap.storage, cap.storage ? 'KV + file ready' : 'ZG_STORAGE_NODE_URL missing')
  row('KeeperHub (exec)', cap.keeperhub, cap.keeperhub ? 'workflows ready' : 'KEEPERHUB_API_KEY missing')
  row('0G Chain / iNFT', cap.onchain, cap.onchain ? 'wallet loaded' : 'PRIVATE_KEY missing')

  console.log(`║                                                            ║`)
  console.log(`╠${line}╣`)

  const modeLabel = report.mode === 'full' ? 'FULL' : report.mode === 'degraded' ? 'DEGRADED' : 'OFFLINE'
  const modeNote = `${report.activeCount}/6 capabilities active`
  const modeLine = `  Mode: ${modeLabel}  (${modeNote})`
  console.log(`║${modeLine.padEnd(60)}║`)

  if (report.missing.length > 0) {
    console.log(`║                                                            ║`)
    console.log(`║  To unlock more capabilities, add to your .env:           ║`)
    for (const m of report.missing.slice(0, 3)) {
      const hint = `  ${m.vars[0]!}=...`
      console.log(`║${hint.padEnd(60)}║`)
    }
    if (report.missing.length > 3) {
      console.log(`║  (+ ${report.missing.length - 3} more — see .env.example)`.padEnd(61) + '║')
    }
  }

  console.log(`╚${line}╝\n`)

  if (report.missing.length > 0) {
    console.log('  Missing capabilities explained:')
    for (const m of report.missing) {
      console.log(`\n  ${m.tier}: ${m.service}`)
      console.log(`    Impact: ${m.impact}`)
      console.log(`    Get it: ${m.getItAt}`)
      console.log(`    Add to .env: ${m.vars.join(' + ')}`)
    }
    console.log('')
  }
}

export function warnIfUnavailable(
  capability: keyof Capabilities,
  report: CapabilityReport,
  agentName: string,
  operation: string,
): void {
  if (!report.capabilities[capability]) {
    const m = report.missing.find((x) =>
      (capability === 'compute' && x.service.includes('Compute')) ||
      (capability === 'storage' && x.service.includes('Storage')) ||
      (capability === 'keeperhub' && x.service.includes('KeeperHub')) ||
      (capability === 'onchain' && x.service.includes('Chain')) ||
      (capability === 'ens' && x.service.includes('ENS'))
    )
    if (m) {
      console.warn(
        `[${agentName}] ${operation} skipped: ${m.service} not configured.\n` +
        `             Add to .env: ${m.vars.join(', ')}\n` +
        `             Get it at: ${m.getItAt}`,
      )
    }
  }
}
