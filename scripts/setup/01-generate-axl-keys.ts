#!/usr/bin/env tsx
/**
 * NeuralMesh — AXL Key Generator
 *
 * What this does:
 *   Creates one cryptographic identity key for each of the 5 NeuralMesh agents.
 *   These keys are what allow agents to identify themselves on the AXL P2P network.
 *
 * Why ed25519?
 *   AXL (the Gensyn P2P layer) uses ed25519 keys for agent identity.
 *   Ed25519 is a fast, secure elliptic curve signature scheme.
 *   Think of each key like a passport — it proves who the agent is.
 *
 * Why PKCS8 PEM format?
 *   PEM (Privacy Enhanced Mail) is a text format for encoding cryptographic keys.
 *   PKCS8 is the standard structure for storing private keys.
 *   AXL reads keys in this exact format.
 *
 * What is a .pem file?
 *   It looks like this:
 *     -----BEGIN PRIVATE KEY-----
 *     MC4CAQAwBQYDK2VdBCIEIBSx...
 *     -----END PRIVATE KEY-----
 *   The gibberish in the middle is your private key, base64-encoded.
 *
 * Why are these in .gitignore?
 *   Private keys are SECRETS. If someone gets your private key, they can
 *   impersonate your agent and potentially steal its earnings.
 *   We NEVER commit keys to git. Back them up somewhere safe.
 *
 * Where are the keys stored?
 *   packages/agents/shared/axl-keys/<agentname>.pem
 *   Each agent reads its own key file at startup.
 *
 * What if I run this twice?
 *   Existing keys are NEVER overwritten. Safe to run multiple times.
 *   (Overwriting keys would break existing connections and ENS records)
 */

import { generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const KEYS_DIR = join(ROOT, 'packages', 'agents', 'shared', 'axl-keys')

const AGENTS = ['planner', 'researcher', 'executor', 'evaluator', 'evolution'] as const

console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║         NeuralMesh — Generating AXL Identity Keys           ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')
console.log(`  Keys will be saved to: ${KEYS_DIR}`)
console.log('  Format: ed25519 PKCS8 PEM (required by AXL)')
console.log('')

// Create the directory if it doesn't exist
if (!existsSync(KEYS_DIR)) {
  mkdirSync(KEYS_DIR, { recursive: true })
  console.log(`  Created directory: packages/agents/shared/axl-keys/`)
}

let generated = 0
let skipped = 0

for (const agent of AGENTS) {
  const keyPath = join(KEYS_DIR, `${agent}.pem`)

  if (existsSync(keyPath)) {
    console.log(`  ✓  ${agent}.pem  ─── already exists, skipping`)
    skipped++
    continue
  }

  // Generate ed25519 key pair using Node.js built-in crypto
  // No openssl needed — works on Windows, macOS, Linux
  const { privateKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
  })

  writeFileSync(keyPath, privateKey, { encoding: 'utf8' })

  // Set file permissions to owner-read-only on Unix (ignored on Windows — that's fine)
  try {
    chmodSync(keyPath, 0o600)
  } catch {
    // Windows doesn't support chmod — silently ignore
  }

  console.log(`  ✓  ${agent}.pem  ─── generated`)
  generated++
}

console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
if (generated > 0) {
  console.log(`║  Generated ${generated} new key(s). ${skipped} already existed.              ║`.padEnd(63) + '║')
} else {
  console.log('║  All keys already exist. Nothing to do.                     ║')
}
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log('║                                                              ║')
console.log('║  IMPORTANT: These files are SECRET private keys.            ║')
console.log('║  They are in .gitignore and will NOT be committed to git.   ║')
console.log('║  Back them up somewhere safe (password manager, etc).       ║')
console.log('║                                                              ║')
console.log('║  Next step: pnpm build                                      ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')
