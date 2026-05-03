import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NeuralMeshConfig } from './agent/AgentConfig.js'
import { Agent } from './agent/Agent.js'
import { defaultState } from './agent/AgentState.js'
import { ENSResolver } from './discovery/ENSResolver.js'
import { AXLClient } from './mesh/AXLClient.js'
import { GossipSub } from './mesh/GossipSub.js'
import { LocalStore } from './memory/LocalStore.js'
import { TrainingBuffer } from './memory/TrainingBuffer.js'
import { Compute } from './intelligence/Compute.js'
import { KeeperHub } from './execution/KeeperHub.js'
import { AgenticWallet } from './execution/AgenticWallet.js'
import { EvolutionLoop } from './evolution/EvolutionLoop.js'
import { privateKeyToAccount } from 'viem/accounts'

// Dummy key used when PRIVATE_KEY is not set.
// Lets us build wallet objects without crashing — on-chain calls will fail
// gracefully with a clear message rather than throwing at startup.
const ZERO_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

export class NeuralMesh {
  static async create(config: NeuralMeshConfig): Promise<Agent> {
    const agentTag = `[${config.name}]`
    console.log(`${agentTag} Initializing...`)

    // ── Step 1: Start AXL P2P node ────────────────────────────────────────────
    const axlBinaryPath = process.env['AXL_BINARY_PATH'] ?? findAxlBinary()
    let axlPubkey = 'offline'
    try {
      axlPubkey = await startAxlSubprocess(axlBinaryPath, config)
      console.log(`${agentTag} AXL mesh online. Pubkey: ${axlPubkey.slice(0, 16)}...`)
    } catch (e) {
      console.warn(
        `${agentTag} AXL startup skipped: ${e instanceof Error ? e.message : e}\n` +
        `            To enable mesh communication: cd packages/axl-go && make build`,
      )
    }

    // ── Step 2: Initialize subsystems ────────────────────────────────────────
    const axl = new AXLClient(config.axlApiPort)
    const ens = new ENSResolver(config.sepoliaRpcUrl || 'https://rpc.sepolia.org')
    const store = new LocalStore(config.name)

    // Resolve wallet
    const walletKey = (config.privateKey && config.privateKey.length >= 64)
      ? config.privateKey as `0x${string}`
      : ZERO_KEY as `0x${string}`
    const walletAddress = privateKeyToAccount(walletKey).address
    const hasWallet = walletKey !== ZERO_KEY

    // AI compute
    const computeConfig: { apiKey?: string; baseURL?: string } = {}
    if (config.tokenrouterApiKey !== undefined) computeConfig.apiKey = config.tokenrouterApiKey
    if (config.tokenrouterBaseUrl !== undefined) computeConfig.baseURL = config.tokenrouterBaseUrl
    const compute = new Compute(computeConfig)

    // KeeperHub — automation and micropayments
    const keeperhub = new KeeperHub({ apiKey: config.keeperhubApiKey ?? '', walletAddress })
    const wallet = new AgenticWallet({ walletAddress, apiKey: config.keeperhubApiKey ?? '' })

    // ── Step 3: ENS state ─────────────────────────────────────────────────────
    const state = defaultState(config.name)
    state.axlPubkey = axlPubkey

    if (!hasWallet) {
      console.warn(
        `${agentTag} ENS writes skipped: PRIVATE_KEY not set.\n` +
        `            Add PRIVATE_KEY to .env to enable reputation tracking on Ethereum.`,
      )
    }

    // ── Step 4: Update ENS records ────────────────────────────────────────────
    if (hasWallet && axlPubkey !== 'offline') {
      try {
        const existing = await ens.getText(config.name, 'axl-pubkey')
        if (existing !== axlPubkey) {
          await ens.setText(config.name, 'axl-pubkey', axlPubkey, walletKey)
          await ens.setText(config.name, 'axl-services', config.capabilities.join(','), walletKey)
          await ens.setText(config.name, 'neural-model', config.model, walletKey)
          console.log(`${agentTag} ENS records updated on Sepolia`)
        } else {
          console.log(`${agentTag} ENS records up-to-date`)
        }
      } catch {
        console.warn(
          `${agentTag} ENS update skipped — name may not be registered yet.\n` +
          `            Register ${config.name} at https://sepolia.app.ens.domains`,
        )
      }
    }

    // ── Step 5: Load existing ENS state ──────────────────────────────────────
    try {
      const records = await ens.resolve(config.name)
      state.version = records.version
      state.reputation = records.reputation
      state.taskCount = records.tasks
    } catch { /* ENS not set up yet — use defaults */ }

    // ── Step 6: Wire training buffer and evolution loop ───────────────────────
    let evolution: EvolutionLoop | null = null

    const trainingBuffer = new TrainingBuffer(
      config.name,
      config.evolutionThreshold ?? 50,
      () => {
        console.log(`${agentTag} Training threshold reached! Notifying evolution agent...`)
        if (evolution) void (evolution as unknown as Record<string, () => void>)['runEvolutionCheck']?.()
      },
    )

    const gossip = new GossipSub(axl, axlPubkey)

    if (config.evolve && hasWallet) {
      evolution = new EvolutionLoop({
        agentName: config.name,
        threshold: config.evolutionThreshold ?? 50,
        trainingBuffer,
        ens,
        gossip,
        keeperhub,
        signerKey: walletKey,
      })
      evolution.start()
      console.log(`${agentTag} Evolution loop active (threshold: ${config.evolutionThreshold ?? 50} tasks)`)
    }

    await gossip.start()
    console.log(`${agentTag} Ready. Serving: ${config.capabilities.join(', ') || 'no services yet'}`)

    return new Agent(config, state, {
      ens, axl, gossip, store, trainingBuffer,
      compute, keeperhub, wallet, evolution,
    })
  }
}

function findAxlBinary(): string {
  const candidates = [
    process.env['AXL_BINARY_PATH'],
    resolve(process.cwd(), 'packages/axl-go/bin/axl-agent'),
    resolve(fileURLToPath(import.meta.url), '../../../axl-go/bin/axl-agent'),
  ].filter(Boolean) as string[]
  return candidates[0] ?? 'axl-agent'
}

async function startAxlSubprocess(binaryPath: string, config: NeuralMeshConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      AXL_API_PORT: String(config.axlApiPort),
      AXL_KEY_PATH: config.axlKeyPath,
      AGENT_NAME: config.name,
      GOTOOLCHAIN: 'go1.25.5',
    }
    const proc = spawn(binaryPath, [], { env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const timer = setTimeout(
      () => reject(new Error(`AXL startup timeout after 30s. Binary: ${binaryPath}`)),
      30_000,
    )

    proc.stdout.on('data', (d: Buffer) => {
      output += d.toString()
      const match = output.match(/READY:(\S+)/)
      if (match?.[1]) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    proc.stderr.on('data', (d: Buffer) => {
      console.error(`[AXL] ${d.toString().trim()}`)
    })
    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(
        new Error(
          `AXL binary not found at: ${binaryPath}\n` +
          `  Original error: ${err.message}\n` +
          `  Fix: cd packages/axl-go && make build`,
        ),
      )
    })
    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timer)
        reject(new Error(`AXL process exited with code ${code}`))
      }
    })
  })
}
