#!/usr/bin/env tsx
/**
 * NeuralMesh Dependency Checker
 *
 * What this does:
 *   Checks that your computer has everything NeuralMesh needs before you try to build.
 *   Better to find out now than to get a confusing error mid-way through setup.
 *
 * Why we check these specific things:
 *   - Node.js 22+: required by the 0G fine-tuning CLI (it uses features from Node 22)
 *   - Go 1.25.x: required to build the AXL binary (Go 1.26+ has a build tag conflict)
 *   - pnpm: the package manager this monorepo uses
 *   - openssl OR node crypto: for generating ed25519 identity keys
 *
 * How to fix failures:
 *   Every failing check prints EXACTLY what to do.
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

interface CheckResult {
  name: string
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

function check(name: string, required: string, foundFn: () => string, fix: string): void {
  const found = foundFn()
  results.push({ name, ok: !!found, found: found || undefined, required, fixMessage: fix })
}

// ── Node.js ──────────────────────────────────────────────────────────────────
check(
  'Node.js',
  '>= 22.0.0',
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
  '>= 9.0.0',
  () => run('pnpm --version'),
  `Install pnpm by running:
     npm install -g pnpm
   Or with corepack (comes with Node 22):
     corepack enable
     corepack prepare pnpm@latest --activate`,
)

// ── Go ───────────────────────────────────────────────────────────────────────
check(
  'Go 1.25.x',
  '1.25.x (NOT 1.26+)',
  () => {
    const v = run('go version')
    // "go version go1.25.5 windows/amd64"
    const match = v.match(/go(\d+)\.(\d+)/)
    if (!match) return ''
    const major = parseInt(match[1]!, 10)
    const minor = parseInt(match[2]!, 10)
    // Must be 1.25.x — 1.26+ breaks gVisor build tags
    return (major === 1 && minor === 25) ? v : ''
  },
  `Install Go 1.25.x from https://go.dev/dl
   IMPORTANT: Do NOT install 1.26 or higher — it breaks the AXL build.
   After installing, set: GOTOOLCHAIN=go1.25.5
   (already in packages/axl-go/go.env, so this is automatic)`,
)

// ── tsx ───────────────────────────────────────────────────────────────────────
check(
  'tsx (TypeScript runner)',
  'any version',
  () => run('tsx --version'),
  `tsx is installed as a dev dependency. Try:
     pnpm install
   If that doesn't fix it: npm install -g tsx`,
)

// ── .env file ────────────────────────────────────────────────────────────────
check(
  '.env file',
  'exists',
  () => existsSync(join(ROOT, '.env')) ? 'found' : '',
  `Copy the example and fill in your values:
     cp .env.example .env
   Then open .env — every variable has a comment explaining what it is and where to get it.`,
)

// ── AXL keys ─────────────────────────────────────────────────────────────────
check(
  'AXL identity keys',
  '5 .pem files',
  () => {
    const keyDir = join(ROOT, 'packages', 'agents', 'shared', 'axl-keys')
    const agents = ['planner', 'researcher', 'executor', 'evaluator', 'evolution']
    const allExist = agents.every((a) => existsSync(join(keyDir, `${a}.pem`)))
    return allExist ? 'all 5 found' : ''
  },
  `Generate keys by running:
     pnpm run keys
   This creates one ed25519 identity key per agent. They're in .gitignore (never committed).`,
)

// ── Print results ─────────────────────────────────────────────────────────────
console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║         NeuralMesh — Dependency Check                        ║')
console.log('╠══════════════════════════════════════════════════════════════╣')

const passed = results.filter((r) => r.ok)
const failed = results.filter((r) => !r.ok)

for (const r of results) {
  const icon = r.ok ? '✓' : '✗'
  const status = r.ok ? (r.found ?? 'ok') : `MISSING (need: ${r.required})`
  const line = `  ${icon}  ${r.name.padEnd(26)} ${status}`
  console.log(`║${line.padEnd(62)}║`)
}

console.log('╠══════════════════════════════════════════════════════════════╣')
if (failed.length === 0) {
  console.log('║  All checks passed! Ready to build NeuralMesh.              ║')
  console.log('║  Next step: pnpm build                                      ║')
} else {
  console.log(`║  ${failed.length} check(s) failed. Fix them before building.            ║`)
}
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')

if (failed.length > 0) {
  console.log('How to fix each failing check:')
  console.log('══════════════════════════════')
  for (const r of failed) {
    console.log(`\n✗ ${r.name}`)
    console.log('  What to do:')
    for (const line of r.fixMessage.split('\n')) {
      console.log(`  ${line}`)
    }
  }
  console.log('')
  process.exit(1)
}
