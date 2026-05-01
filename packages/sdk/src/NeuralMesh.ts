import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NeuralMeshConfig } from './agent/AgentConfig.js'
import { Agent } from './agent/Agent.js'
import { defaultState } from './agent/AgentState.js'
import { ENSResolver } from './discovery/ENSResolver.js'
import { AXLClient } from './mesh/AXLClient.js'
import { GossipSub } from './mesh/GossipSub.js'
import { KVStore } from './memory/KVStore.js'
import { LogStore } from './memory/LogStore.js'
import { TrainingBuffer } from './memory/TrainingBuffer.js'
import { Compute } from './intelligence/Compute.js'
import { FineTuner } from './intelligence/FineTuner.js'
import { LoRAManager } from './intelligence/LoRAManager.js'
import { KeeperHub } from './execution/KeeperHub.js'
import { AgenticWallet } from './execution/AgenticWallet.js'
import { iNFTClient } from './identity/iNFT.js'
import { Registry } from './identity/Registry.js'
import { EvolutionLoop } from './evolution/EvolutionLoop.js'
import { privateKeyToAccount } from 'viem/accounts'

export class NeuralMesh {
  static async create(config: NeuralMeshConfig): Promise<Agent> {
    console.log(`[NeuralMesh] Initializing agent: ${config.name}`)

    // 1. Start AXL subprocess
    const axlBinaryPath = process.env['AXL_BINARY_PATH'] ?? findAxlBinary()
    const axlPubkey = await startAxlSubprocess(axlBinaryPath, config)
    console.log(`[NeuralMesh] AXL started. Pubkey: ${axlPubkey}`)

    // 2. Initialize all subsystems
    const axl = new AXLClient(config.axlApiPort)
    const ens = new ENSResolver(config.sepoliaRpcUrl)
    const kv = new KVStore(config.zgStorageKvNodeUrl, config.zgStorageNodeUrl, config.privateKey, config.name)
    const logStore = new LogStore(config.zgStorageNodeUrl, config.privateKey, config.name)
    const inft = new iNFTClient(config.inftContract, config.zgRpcUrl, config.privateKey)
    const registry = new Registry(config.registryContract, config.zgRpcUrl, config.privateKey)
    const compute = new Compute({
      apiKey: config.zgApiKey,
      serviceUrl: process.env['ZG_SERVICE_URL'] ?? 'https://api.0gcompute.ai/v1',
      provider: config.zgComputeProvider,
    })
    const fineTuner = new FineTuner({
      provider: config.zgFinetuneProvider ?? '',
      privateKey: config.privateKey,
      zgRpcUrl: config.zgRpcUrl,
    })
    const keeperhub = new KeeperHub({
      apiKey: config.keeperhubApiKey ?? '',
      walletAddress: privateKeyToAccount(config.privateKey as `0x${string}`).address,
    })
    const wallet = new AgenticWallet({
      walletAddress: privateKeyToAccount(config.privateKey as `0x${string}`).address,
      apiKey: config.keeperhubApiKey ?? '',
    })

    // 3. Check/mint iNFT if needed
    const state = defaultState(config.name)
    state.axlPubkey = axlPubkey
    let inftTokenId = 0
    try {
      const agentRecord = await registry.getAgent(
        privateKeyToAccount(config.privateKey as `0x${string}`).address,
      )
      inftTokenId = agentRecord.inftTokenId
      state.inftTokenId = inftTokenId
      console.log(`[NeuralMesh] Existing iNFT: tokenId=${inftTokenId}`)
    } catch {
      // Not registered yet — mint iNFT
      console.log('[NeuralMesh] No iNFT found. Minting...')
      const metadata = { name: config.name, capabilities: config.capabilities, model: config.model }
      const encryptedURI = iNFTClient.buildEncryptedURI(metadata)
      const metadataHash = iNFTClient.buildMetadataHash(metadata)
      inftTokenId = await inft.mint(encryptedURI, metadataHash)
      state.inftTokenId = inftTokenId
      console.log(`[NeuralMesh] Minted iNFT tokenId=${inftTokenId}`)
    }

    // 4. Set ENS text records (axl-pubkey, axl-services)
    try {
      const existing = await ens.getText(config.name, 'axl-pubkey')
      if (existing !== axlPubkey) {
        await ens.setText(config.name, 'axl-pubkey', axlPubkey, config.privateKey)
        await ens.setText(config.name, 'axl-services', config.capabilities.join(','), config.privateKey)
        await ens.setText(config.name, 'neural-model', config.model, config.privateKey)
        console.log(`[NeuralMesh] ENS records updated for ${config.name}`)
      }
    } catch (e) {
      console.warn('[NeuralMesh] ENS update skipped (may not be registered yet):', e)
    }

    // 5. Sync state from ENS
    try {
      const records = await ens.resolve(config.name)
      state.version = records.version
      state.reputation = records.reputation
      state.taskCount = records.tasks
    } catch { /* first run */ }

    // 6. Wire training buffer
    const loraManager = new LoRAManager(logStore, config.inftContract, config.zgRpcUrl, config.privateKey)
    let evolution: EvolutionLoop | null = null
    const trainingBuffer = new TrainingBuffer(
      logStore,
      config.evolutionThreshold ?? 50,
      () => {
        console.log(`[NeuralMesh] Training threshold reached for ${config.name}!`)
        if (evolution) void evolution['runEvolutionCheck' as keyof EvolutionLoop]?.()
      },
    )
    const gossip = new GossipSub(axl, axlPubkey)

    // 7. Wire evolution loop
    if (config.evolve && config.zgFinetuneProvider) {
      evolution = new EvolutionLoop({
        agentName: config.name,
        threshold: config.evolutionThreshold ?? 50,
        trainingBuffer,
        fineTuner,
        loraManager,
        ens,
        inft,
        gossip,
        keeperhub,
        inftTokenId,
        signerKey: config.privateKey,
        zgFinetuneProvider: config.zgFinetuneProvider,
      })
      evolution.start()
    }

    await gossip.start()

    return new Agent(config, state, {
      ens, axl, gossip, kv, log: logStore, trainingBuffer,
      compute, fineTuner, keeperhub, wallet, inft, evolution,
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
    const timer = setTimeout(() => reject(new Error('AXL startup timeout')), 30_000)

    proc.stdout.on('data', (d: Buffer) => {
      output += d.toString()
      const match = output.match(/READY:(\S+)/)
      if (match?.[1]) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    proc.stderr.on('data', (d: Buffer) => {
      console.error('[AXL]', d.toString().trim())
    })
    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`AXL binary not found at ${binaryPath}: ${err.message}`))
    })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`AXL exited with code ${code}`))
    })
  })
}
