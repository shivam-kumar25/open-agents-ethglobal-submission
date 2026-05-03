#!/usr/bin/env tsx
/**
 * NeuralMesh Demo — Send a task to the Planner agent
 *
 * What this does:
 *   Sends a DeFi research question to the planner agent via AXL.
 *   The planner breaks it down, delegates to the researcher, and returns results.
 *
 * What you need first:
 *   1. pnpm start:agents  ← agents must be running
 *   2. The AXL binary must be built (requires Go 1.25.x)
 *      Without AXL, agents start in offline mode with no HTTP bridge.
 *
 * If you see ECONNREFUSED on port 9002:
 *   The planner is running but AXL is not — so there's no HTTP endpoint to receive tasks.
 *   Fix: cd packages/axl-go && make build   (needs Go 1.25.x)
 */

import 'dotenv/config'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const PLANNER_AXL_PORT = parseInt(process.env['PLANNER_AXL_API_PORT'] ?? '9002', 10)
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

async function sendDemoTask() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║         NeuralMesh Demo — Sending a Task                    ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log('  Task: "What are the best DeFi yield opportunities for USDC?"')
  console.log(`  Sending to: planner.neuralmesh.eth (port ${PLANNER_AXL_PORT})`)
  console.log('')

  // ── Step 1: Check if agents were started ────────────────────────────────────
  const pidFile = join(ROOT, 'logs', 'planner.pid')
  if (!existsSync(pidFile)) {
    console.log('  ✗  Agents are not running.')
    console.log('')
    console.log('  Start them first:')
    console.log('    pnpm start:agents')
    console.log('')
    process.exit(1)
  }

  // ── Step 2: Try to reach the planner's AXL HTTP bridge ──────────────────────
  let self: { pubkey: string }
  try {
    const res = await fetch(`http://127.0.0.1:${PLANNER_AXL_PORT}/api/self`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    self = await res.json() as { pubkey: string }
  } catch (err) {
    const isRefused = String(err).includes('ECONNREFUSED') || String(err).includes('fetch failed')
    console.log('  ✗  Cannot reach planner on port ' + PLANNER_AXL_PORT)
    console.log('')

    if (isRefused) {
      console.log('  WHY THIS HAPPENS:')
      console.log('  The planner agent is running, but in offline mode.')
      console.log('  AXL is the HTTP bridge that lets you send tasks to agents.')
      console.log('  Without the AXL binary, there is no server on port 9002.')
      console.log('')
      console.log('  HOW TO FIX:')
      console.log('  The AXL binary needs to be built from source (requires Go 1.25.x).')
      console.log('')
      console.log('  Step 1 — Install Go 1.25.x:')
      console.log('    https://go.dev/dl  (choose 1.25.x, NOT 1.26+)')
      console.log('')
      console.log('  Step 2 — Build the AXL binary:')
      console.log('    cd packages/axl-go && make build')
      console.log('')
      console.log('  Step 3 — Restart the agents:')
      console.log('    pnpm stop && pnpm start:agents')
      console.log('')
      console.log('  MEANWHILE — you can still see what agents are doing:')
      console.log('')
      console.log('    # Windows PowerShell:')
      console.log('    Get-Content logs/planner.log -Wait')
      console.log('')
      console.log('    # Mac/Linux:')
      console.log('    tail -f logs/planner.log')
      console.log('')
      console.log('  The logs show the capability report and any activity.')
    } else {
      console.log('  Error details:', String(err))
    }

    process.exit(1)
  }

  console.log(`  ✓  Planner online. Pubkey: ${self.pubkey.slice(0, 16)}...`)
  console.log('')

  // ── Step 3: Send task via AXL ───────────────────────────────────────────────
  const taskId = `demo-${Date.now()}`
  const payload = {
    service: 'plan',
    request: {
      query: 'What are the best DeFi yield opportunities for USDC right now? Include Aave, Uniswap, and Compound.',
    },
    requestId: taskId,
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')

  let sendOk = false
  try {
    const sendRes = await fetch(`http://127.0.0.1:${PLANNER_AXL_PORT}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dst: self.pubkey, payload: payloadBase64 }),
      signal: AbortSignal.timeout(5000),
    })
    sendOk = sendRes.ok
    if (!sendRes.ok) {
      const body = await sendRes.text()
      console.log(`  ✗  Send failed (HTTP ${sendRes.status}): ${body}`)
    }
  } catch (err) {
    console.log('  ✗  Failed to send task:', String(err))
  }

  if (sendOk) {
    console.log(`  ✓  Task ${taskId} sent!`)
    console.log('')
    console.log('  Watch agents process it live:')
    console.log('')
    console.log('    # Windows PowerShell:')
    console.log('    Get-Content logs/planner.log -Wait')
    console.log('    Get-Content logs/researcher.log -Wait')
    console.log('')
    console.log('    # Mac/Linux:')
    console.log('    tail -f logs/planner.log')
    console.log('    tail -f logs/researcher.log')
    console.log('')
    console.log('  Or open the dashboard: pnpm dashboard')
    console.log('  Then visit: http://localhost:5173')
    console.log('')
  }
}

void sendDemoTask()
