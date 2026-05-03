export interface Capabilities {
  axl: boolean
  ens: boolean
  compute: boolean
  keeperhub: boolean
  wallet: boolean
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
    compute: !!(env['TOKENROUTER_API_KEY']),
    keeperhub: !!(env['KEEPERHUB_API_KEY']),
    wallet: !!(env['PRIVATE_KEY']),
  }

  const missing: MissingCapability[] = []

  if (!capabilities.ens) {
    missing.push({
      tier: 'TIER 2',
      service: 'ENS Discovery (Sepolia)',
      vars: ['SEPOLIA_RPC_URL'],
      getItAt: 'https://dashboard.alchemy.com (free — create app → Ethereum → Sepolia)',
      impact: 'Agents cannot find each other by name. AXL pubkeys must be hardcoded.',
    })
  }
  if (!capabilities.compute) {
    missing.push({
      tier: 'TIER 3',
      service: 'AI Compute (TokenRouter)',
      vars: ['TOKENROUTER_API_KEY'],
      getItAt: 'https://tokenrouter.com',
      impact: 'Agents return "inference unavailable" instead of AI responses.',
    })
  }
  if (!capabilities.keeperhub) {
    missing.push({
      tier: 'TIER 4',
      service: 'KeeperHub (automation + payments)',
      vars: ['KEEPERHUB_API_KEY'],
      getItAt: 'https://app.keeperhub.com/settings/api',
      impact: 'Workflow automation and x402 micropayments are disabled.',
    })
  }
  if (!capabilities.wallet) {
    missing.push({
      tier: 'TIER 5',
      service: 'EVM Wallet (ENS writes)',
      vars: ['PRIVATE_KEY'],
      getItAt: 'MetaMask → Settings → Security → Show Private Key',
      impact: 'Agents cannot write ENS reputation records or sign payments.',
    })
  }

  const activeCount = Object.values(capabilities).filter(Boolean).length
  const mode: CapabilityReport['mode'] =
    activeCount === 5 ? 'full' : activeCount >= 2 ? 'degraded' : 'offline'

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

  row('AXL mesh (P2P)',     cap.axl,       'always available')
  row('ENS discovery',     cap.ens,       cap.ens       ? 'Sepolia connected'             : 'SEPOLIA_RPC_URL missing')
  row('AI compute',        cap.compute,   cap.compute   ? 'TokenRouter ready'             : 'TOKENROUTER_API_KEY missing')
  row('KeeperHub',         cap.keeperhub, cap.keeperhub ? 'workflows + payments ready'    : 'KEEPERHUB_API_KEY missing')
  row('Wallet (ENS write)', cap.wallet,   cap.wallet    ? 'signing ready'                 : 'PRIVATE_KEY missing')

  console.log(`║                                                            ║`)
  console.log(`╠${line}╣`)

  const modeLabel = report.mode === 'full' ? 'FULL' : report.mode === 'degraded' ? 'DEGRADED' : 'OFFLINE'
  const modeNote = `${report.activeCount}/5 capabilities active`
  const modeLine = `  Mode: ${modeLabel}  (${modeNote})`
  console.log(`║${modeLine.padEnd(60)}║`)

  if (report.missing.length > 0) {
    console.log(`║                                                            ║`)
    console.log(`║  To unlock more capabilities, add to your .env:           ║`)
    for (const m of report.missing.slice(0, 3)) {
      const hint = `  ${m.vars[0]!}=...`
      console.log(`║${hint.padEnd(60)}║`)
    }
  }

  console.log(`╚${line}╝\n`)

  if (report.missing.length > 0) {
    console.log('  Missing capabilities:')
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
      (capability === 'compute'   && x.service.includes('AI')) ||
      (capability === 'keeperhub' && x.service.includes('KeeperHub')) ||
      (capability === 'wallet'    && x.service.includes('Wallet')) ||
      (capability === 'ens'       && x.service.includes('ENS'))
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
