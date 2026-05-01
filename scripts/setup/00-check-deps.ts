#!/usr/bin/env tsx
/**
 * NeuralMesh Dependency Checker
 *
 * What this does:
 *   Checks that your computer has everything NeuralMesh needs before you try to build.
 *   Better to find out now than to get a confusing error mid-way through setup.
 *
 * Two tiers of checks:
 *   REQUIRED — missing these means nothing works (Node.js, pnpm, tsx, AXL keys)
 *   OPTIONAL — missing these disables specific features but most things still work
 *              Go 1.25.x: only needed to build the AXL P2P binary
 *              .env file:  agents start in degraded mode if missing
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

type CheckLevel = 'required' | 'optional'

interface CheckResult {
  name: string
  level: CheckLevel
  ok: boolean
  found?: string
  required: string
  fixMessage: string
}

const results: CheckResult[] = []

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function check(
  name: string,
  level: CheckLevel,
  required: string,
  foundFn: () => string,
  fix: string,
): void {
  const found = foundFn()
  results.push({ name, level, ok: !!found, found: found || undefined, required, fixMessage: fix })
}

// ── Node.js ──────────────────────────────────────────────────────────────────
check(
  'Node.js',
  'required',
  '>= 22',
  () => {
    const v = run('node --version')
    if (!v) return ''
    const major = parseInt(v.replace('v', '').split('.')[0]!, 10)
    return major >= 22 ? v : ''
  },
  `Install Node.js 22 or higher from https://nodejs.org
   Tip: use nvm (Node Version Manager) to easily switch versions:
     nvm install 22
     nvm use 22`,
)

// ── pnpm ─────────────────────────────────────────────────────────────────────
check(
  'pnpm',
  'required',
  '>= 9',
  () => run('pnpm --version'),
  `Install pnpm by running:
     npm install -g pnpm
   Or with corepack (comes with Node 22):
     corepack enable
     corepack prepare pnpm@latest --activate`,
)

// ── tsx ───────────────────────────────────────────────────────────────────────
check(
  'tsx (TypeScript runner)',
  'required',
  'any version',
  () => run('tsx --version').split('\n')[0]!.trim(),
  `tsx is installed as a dev dependency. Try:
     pnpm install
   If that doesn't fix it: npm install -g tsx`,
)

// ── .env file ────────────────────────────────────────────────────────────────
check(
  '.env file',
  'optional',
  'exists',
  () => existsSync(join(ROOT, '.env')) ? 'found' : '',
  `Copy the example and fill in your values:
     cp .env.example .env
   Open .env — every variable has a comment explaining what it does and where to get it.
   Agents start without it but most features will be disabled.`,
)

// ── AXL keys ─────────────────────────────────────────────────────────────────
check(
  'AXL identity keys',
  'required',
  '5 .pem files',
  () => {
    const keyDir = join(ROOT, 'packages', 'agents', 'shared', 'axl-keys')
    const agents = ['planner', 'researcher', 'executor', 'evaluator', 'evolution']
    const allExist = agents.every((a) => existsSync(join(keyDir, `${a}.pem`)))
    return allExist ? 'all 5 found' : ''
  },
  `Generate keys by running:
     pnpm keys
   This creates one ed25519 identity key per agent using Node.js built-in crypto.
   No openssl or WSL required. Keys are in .gitignore (never committed to git).`,
)

// ── Go (optional — only for AXL binary) ──────────────────────────────────────
check(
  'Go 1.25.x (for AXL)',
  'optional',
  '1.25.x only',
  () => {
    const v = run('go version')
    // "go version go1.25.5 windows/amd64"
    const match = v.match(/go(\d+)\.(\d+)/)
    if (!match) return ''
    const major = parseInt(match[1]!, 10)
    const minor = parseInt(match[2]!, 10)
    // Must be exactly 1.25.x — 1.26+ breaks gVisor build tags in AXL
    return (major === 1 && minor === 25) ? v.split(' ')[2]! : ''
  },
  `Go 1.25.x is only needed to build the AXL P2P binary (packages/axl-go).
   Without it, agents communicate via the pre-built binary (if available),
   or run without P2P mesh (degraded mode — still useful for demos).

   To build AXL yourself:
     Install Go 1.25.x from https://go.dev/dl
     IMPORTANT: Do NOT install 1.26 or higher — it breaks the AXL build.
     After installing: cd packages/axl-go && make build`,
)

// ── Print results ─────────────────────────────────────────────────────────────
const BOX_WIDTH = 62  // content chars between ║ and ║

function boxLine(content: string): void {
  console.log(`║${content.padEnd(BOX_WIDTH)}║`)
}

console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║         NeuralMesh — Dependency Check                        ║')
console.log('╠══════════════════════════════════════════════════════════════╣')

const failed = results.filter((r) => !r.ok && r.level === 'required')
const warned = results.filter((r) => !r.ok && r.level === 'optional')

for (const r of results) {
  let icon: string
  if (r.ok) icon = '✓'
  else if (r.level === 'optional') icon = '⚠'
  else icon = '✗'

  const rawStatus = r.ok
    ? (r.found ?? 'ok')
    : r.level === 'optional' ? 'not found (optional)' : `MISSING — need ${r.required}`

  const nameCol = r.name.padEnd(26)
  const maxStatusLen = BOX_WIDTH - 2 - 3 - nameCol.length - 1
  const status = rawStatus.length > maxStatusLen
    ? rawStatus.slice(0, maxStatusLen - 1) + '…'
    : rawStatus

  boxLine(`  ${icon}  ${nameCol} ${status}`)
}

console.log('╠══════════════════════════════════════════════════════════════╣')

if (failed.length === 0 && warned.length === 0) {
  boxLine('  All checks passed! Ready to build.')
  boxLine('  Next step: pnpm build')
} else if (failed.length === 0) {
  boxLine(`  Ready to build.  (${warned.length} optional item(s) missing)`)
  boxLine('  Next step: pnpm build')
} else {
  boxLine(`  ${failed.length} required check(s) failed — fix before building.`)
}

console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')

if (warned.length > 0) {
  console.log('Optional items (won\'t block build — unlock more features):')
  console.log('═══════════════════════════════════════════════════════════')
  for (const r of warned) {
    console.log(`\n⚠  ${r.name}`)
    for (const line of r.fixMessage.split('\n')) {
      console.log(`   ${line}`)
    }
  }
  console.log('')
}

if (failed.length > 0) {
  console.log('Required fixes (must have before building):')
  console.log('═══════════════════════════════════════════')
  for (const r of failed) {
    console.log(`\n✗  ${r.name}`)
    for (const line of r.fixMessage.split('\n')) {
      console.log(`   ${line}`)
    }
  }
  console.log('')
  process.exit(1)
}
