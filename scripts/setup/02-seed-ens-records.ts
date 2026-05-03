#!/usr/bin/env tsx
/**
 * NeuralMesh — ENS Record Seeder
 *
 * Seeds initial text records for all 5 NeuralMesh agents on Sepolia ENS.
 * Run this once after registering the ENS names and before starting agents.
 *
 * REQUIREMENT:
 *   Your PRIVATE_KEY must be the controller (manager) of each agent subname.
 *   Check at: https://app.ens.domains/<name>  →  Ownership tab
 *
 * USAGE:
 *   cd <repo-root>
 *   pnpm tsx scripts/setup/02-seed-ens-records.ts
 *
 *   Or with a custom RPC:
 *   SEPOLIA_RPC_URL=https://... pnpm tsx scripts/setup/02-seed-ens-records.ts
 */

import 'dotenv/config'
import { createWalletClient, createPublicClient, http, type Hex } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { normalize, namehash } from 'viem/ens'

// ── Config ──────────────────────────────────────────────────────────────────

const SEPOLIA_RPC   = process.env['SEPOLIA_RPC_URL'] ?? 'https://ethereum-sepolia-rpc.publicnode.com'
const PRIVATE_KEY   = process.env['PRIVATE_KEY'] as Hex | undefined
const MODEL         = process.env['TOKENROUTER_MODEL'] ?? 'meta-llama/Llama-3.1-8B-Instruct'

// ENS public resolver on Sepolia
const ENS_RESOLVER  = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5' as const

const SET_TEXT_ABI = [{
  name: 'setText',
  type: 'function',
  inputs: [
    { name: 'node',  type: 'bytes32' },
    { name: 'key',   type: 'string'  },
    { name: 'value', type: 'string'  },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
}] as const

// ── Agent definitions ────────────────────────────────────────────────────────

const AGENTS = [
  {
    ensName:      'planner.neuralmesh.eth',
    services:     'plan,orchestrate',
    version:      'v1.0.0',
    reputation:   '92',
    tasks:        '47',
    model:        MODEL,
  },
  {
    ensName:      'researcher.neuralmesh.eth',
    services:     'research,analysis,search',
    version:      'v1.0.0',
    reputation:   '88',
    tasks:        '63',
    model:        MODEL,
  },
  {
    ensName:      'executor.neuralmesh.eth',
    services:     'execute,transact,simulate',
    version:      'v1.0.0',
    reputation:   '85',
    tasks:        '19',
    model:        MODEL,
  },
  {
    ensName:      'evaluator.neuralmesh.eth',
    services:     'evaluate,score,rank',
    version:      'v1.0.0',
    reputation:   '91',
    tasks:        '54',
    model:        MODEL,
  },
  {
    ensName:      'evolution.neuralmesh.eth',
    services:     'evolve,trigger-evolution,monitor',
    version:      'v1.0.0',
    reputation:   '78',
    tasks:        '11',
    model:        MODEL,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok(msg: string)   { console.log(`  ✓  ${msg}`) }
function warn(msg: string) { console.warn(`  ⚠  ${msg}`) }
function err(msg: string)  { console.error(`  ✗  ${msg}`) }

async function setText(
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  ensName: string,
  key: string,
  value: string,
): Promise<boolean> {
  try {
    const node = namehash(normalize(ensName))
    const hash = await walletClient.writeContract({
      address:      ENS_RESOLVER,
      abi:          SET_TEXT_ABI,
      functionName: 'setText',
      args:         [node, key, value],
      account,
    })
    ok(`${ensName}  ${key} = "${value}"  (tx: ${hash.slice(0, 18)}...)`)
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    err(`${ensName}  ${key}  →  ${msg.slice(0, 120)}`)
    return false
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║     NeuralMesh — ENS Record Seeder           ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  if (!PRIVATE_KEY || PRIVATE_KEY.length < 64) {
    err('PRIVATE_KEY not set in .env — cannot sign ENS transactions')
    console.log('\n  Add to .env:  PRIVATE_KEY=0x<your-64-char-hex-key>')
    console.log('  Get one:      metamask → Settings → Security → Reveal Private Key')
    process.exit(1)
  }

  const account = privateKeyToAccount(PRIVATE_KEY)
  console.log(`  Wallet:  ${account.address}`)
  console.log(`  RPC:     ${SEPOLIA_RPC}\n`)

  const publicClient  = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })
  const walletClient  = createWalletClient({ account, chain: sepolia, transport: http(SEPOLIA_RPC) })

  // Check wallet has some ETH for gas
  const balance = await publicClient.getBalance({ address: account.address })
  const ethBal  = Number(balance) / 1e18
  console.log(`  Balance: ${ethBal.toFixed(4)} ETH`)

  if (ethBal < 0.002) {
    warn('Balance is very low — you may not have enough ETH for gas fees')
    warn('Get Sepolia ETH from: https://sepoliafaucet.com')
    console.log()
  }

  let total = 0, success = 0

  for (const agent of AGENTS) {
    console.log(`\n── ${agent.ensName} ──`)

    const records: Array<[string, string]> = [
      ['neural-version',    agent.version    ],
      ['neural-reputation', agent.reputation ],
      ['neural-tasks',      agent.tasks      ],
      ['axl-services',      agent.services   ],
      ['neural-model',      agent.model      ],
    ]

    for (const [key, value] of records) {
      total++
      const wrote = await setText(walletClient, account, agent.ensName, key, value)
      if (wrote) success++
      // Small delay to avoid nonce issues
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log(`║  Done: ${success}/${total} records written`)
  if (success < total) {
    console.log(`║  ${total - success} failed — check errors above`)
    console.log('║  Common cause: wallet is not the ENS manager')
    console.log('║  Check ownership at: https://app.ens.domains')
  }
  console.log('╚══════════════════════════════════════════════╝\n')
}

main().catch((e) => {
  err(`Fatal: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
