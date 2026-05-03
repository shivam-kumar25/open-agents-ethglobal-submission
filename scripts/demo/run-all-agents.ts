#!/usr/bin/env tsx
/**
 * NeuralMesh — Start All 5 Agents
 *
 * What this does:
 *   Starts all 5 NeuralMesh agents as separate background processes.
 *   Each agent gets its own log file and PID file so you can stop them later.
 *
 * Why 5 separate processes?
 *   Each agent is an independent AI worker. They run in parallel — while
 *   the researcher is thinking, the evaluator can be scoring something else.
 *   Separate processes also means each has its own AXL P2P identity.
 *
 * Why do they each have a different port?
 *   AXL uses HTTP to bridge between your app code and the P2P mesh.
 *   Each agent needs its own HTTP port so they don't conflict.
 *   The ports are:
 *     planner:    http://localhost:9002
 *     researcher: http://localhost:9012
 *     executor:   http://localhost:9022
 *     evaluator:  http://localhost:9032
 *     evolution:  http://localhost:9042
 *
 * What are PID files?
 *   PID = Process ID. Every running program gets a number (its PID).
 *   We save each agent's PID to logs/<name>.pid so stop-all-agents.ts
 *   knows which processes to kill when you want to stop everything.
 *
 * What if an agent fails to start?
 *   Check logs/<name>.log — the agent prints its startup report there.
 *   The most common reason: missing env vars (the agent will tell you).
 *
 * How to check if it's working:
 *   curl http://localhost:9003/api/self  # should return {"name": "...", "online": true}
 *   tail -f logs/planner.log            # see live output
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, openSync, closeSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const LOGS_DIR = join(ROOT, 'logs')

// Make sure the logs directory exists
if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true })

interface AgentConfig {
  name: string
  entryPoint: string
  port: number
  description: string
}

const AGENTS: AgentConfig[] = [
  {
    name: 'planner',
    entryPoint: join(ROOT, 'packages', 'agents', 'planner', 'dist', 'index.js'),
    port: 9002,
    description: 'Orchestrator — receives your tasks, hires specialists',
  },
  {
    name: 'researcher',
    entryPoint: join(ROOT, 'packages', 'agents', 'researcher', 'dist', 'index.js'),
    port: 9012,
    description: 'Knowledge agent — DeFi research, gets smarter over time',
  },
  {
    name: 'executor',
    entryPoint: join(ROOT, 'packages', 'agents', 'executor', 'dist', 'index.js'),
    port: 9022,
    description: 'Action agent — reliable blockchain execution via KeeperHub',
  },
  {
    name: 'evaluator',
    entryPoint: join(ROOT, 'packages', 'agents', 'evaluator', 'dist', 'index.js'),
    port: 9032,
    description: 'Quality agent — scores results, updates ENS reputation',
  },
  {
    name: 'evolution',
    entryPoint: join(ROOT, 'packages', 'agents', 'evolution', 'dist', 'index.js'),
    port: 9042,
    description: 'Meta-agent — watches for training thresholds, triggers fine-tuning',
  },
]

console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║         NeuralMesh — Starting All 5 Agents                  ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')

// Check if agents are already running
let alreadyRunning = 0
for (const agent of AGENTS) {
  const pidFile = join(LOGS_DIR, `${agent.name}.pid`)
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf8').trim()
    try {
      process.kill(parseInt(pid, 10), 0) // Signal 0 = just check, don't kill
      console.log(`  ⚠  ${agent.name} is already running (PID ${pid})`)
      alreadyRunning++
    } catch {
      // PID file exists but process is dead — clean up
    }
  }
}

if (alreadyRunning > 0) {
  console.log('')
  console.log(`  ${alreadyRunning} agent(s) already running.`)
  console.log('  To restart: pnpm stop, then pnpm start:agents')
  console.log('')
  process.exit(0)
}

// Check that built files exist
console.log('  Checking built files...')
let missingBuilds = 0
for (const agent of AGENTS) {
  if (!existsSync(agent.entryPoint)) {
    console.log(`  ✗  ${agent.name}/dist/index.js not found — run pnpm build first`)
    missingBuilds++
  }
}
if (missingBuilds > 0) {
  console.log('')
  console.log('  Run this first: pnpm build')
  console.log('')
  process.exit(1)
}
console.log('  ✓  All built files found')
console.log('')

// Start each agent
const envFile = join(ROOT, '.env')
if (!existsSync(envFile)) {
  console.log('  ⚠  No .env file found. Agents will start in degraded mode.')
  console.log('     Copy .env.example to .env and fill in your keys to unlock all features.')
  console.log('')
}

for (const agent of AGENTS) {
  const logFile = join(LOGS_DIR, `${agent.name}.log`)
  const pidFile = join(LOGS_DIR, `${agent.name}.pid`)

  // openSync gives an fd immediately (sync) — createWriteStream's fd is null
  // until the 'open' event fires, which causes ERR_INVALID_ARG_VALUE in spawn.
  const logFd = openSync(logFile, 'a')

  const proc = spawn(process.execPath, [agent.entryPoint], {
    env: { ...process.env },
    stdio: ['ignore', logFd, logFd],
    detached: true,
  })

  closeSync(logFd) // child has its own copy; close the parent's fd
  proc.unref()     // let this script exit without waiting for agents

  writeFileSync(pidFile, String(proc.pid), 'utf8')

  const portUrl = `http://localhost:${agent.port}/api/self`
  const pidPad = String(proc.pid).padEnd(7)
  console.log(`  ✓  ${agent.name.padEnd(12)} PID: ${pidPad} │ Port: :${agent.port} │ ${agent.description}`)
  console.log(`       Log:  logs/${agent.name}.log`)
}

console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║  All 5 agents started!                                       ║')
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log('║                                                              ║')
console.log('║  Give them ~5 seconds to initialize, then check:            ║')
console.log('║                                                              ║')
console.log('║  curl http://localhost:9003/api/self  ← planner             ║')
console.log('║  curl http://localhost:9013/api/self  ← researcher          ║')
console.log('║                                                              ║')
console.log('║  Open the dashboard:                                         ║')
console.log('║    pnpm dashboard                                            ║')
console.log('║    Then open: http://localhost:5173                          ║')
console.log('║                                                              ║')
console.log('║  Send a demo task:                                           ║')
console.log('║    pnpm demo                                                 ║')
console.log('║                                                              ║')
console.log('║  Watch live logs:                                            ║')
console.log('║    # Windows PowerShell:                                     ║')
console.log('║    Get-Content logs/planner.log -Wait                       ║')
console.log('║    # Mac/Linux:                                              ║')
console.log('║    tail -f logs/planner.log                                  ║')
console.log('║                                                              ║')
console.log('║  Stop everything:                                            ║')
console.log('║    pnpm stop                                                 ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')
