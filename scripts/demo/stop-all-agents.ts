#!/usr/bin/env tsx
/**
 * NeuralMesh — Stop All Agents
 *
 * What this does:
 *   Gracefully stops all 5 NeuralMesh agents that were started by run-all-agents.ts.
 *   Reads each agent's PID file, sends a termination signal, cleans up.
 *
 * Why PID files?
 *   When we start agents, we save their process IDs to logs/<name>.pid files.
 *   This script reads those files to know which processes to stop.
 *   Without PID files, we'd have to search all running processes by name — fragile.
 *
 * What if an agent is already stopped?
 *   That's fine — we just clean up the PID file and move on.
 *
 * What if logs/<name>.pid doesn't exist?
 *   The agent was never started (or was stopped manually). We skip it.
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const LOGS_DIR = join(ROOT, 'logs')
const AGENTS = ['planner', 'researcher', 'executor', 'evaluator', 'evolution']

console.log('')
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║         NeuralMesh — Stopping All Agents                     ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log('')

let stopped = 0
let notRunning = 0

for (const name of AGENTS) {
  const pidFile = join(LOGS_DIR, `${name}.pid`)

  if (!existsSync(pidFile)) {
    console.log(`  ○  ${name.padEnd(12)} not running (no PID file)`)
    notRunning++
    continue
  }

  const pidStr = readFileSync(pidFile, 'utf8').trim()
  const pid = parseInt(pidStr, 10)

  try {
    process.kill(pid, 'SIGTERM')
    console.log(`  ✓  ${name.padEnd(12)} stopped (PID ${pid})`)
    stopped++
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ESRCH') {
      // Process not found — already dead, just clean up
      console.log(`  ○  ${name.padEnd(12)} already stopped (PID ${pid} not found)`)
      notRunning++
    } else {
      console.log(`  ✗  ${name.padEnd(12)} error stopping PID ${pid}: ${e}`)
    }
  }

  // Clean up PID file regardless
  try { unlinkSync(pidFile) } catch { /* ignore */ }
}

console.log('')
console.log(`  Stopped: ${stopped}   Already stopped: ${notRunning}`)
console.log('')
console.log('  Logs are still in logs/ if you want to review them.')
console.log('  To start again: pnpm start:agents')
console.log('')
