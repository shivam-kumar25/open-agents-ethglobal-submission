#!/usr/bin/env tsx
import 'dotenv/config'

const PLANNER_AXL_PORT = parseInt(process.env['PLANNER_AXL_API_PORT'] ?? '9002', 10)

async function sendDemoTask() {
  console.log('NeuralMesh Demo — Sending task to planner...\n')

  // 1. Get planner's AXL pubkey
  const selfRes = await fetch(`http://127.0.0.1:${PLANNER_AXL_PORT}/api/self`)
  if (!selfRes.ok) {
    console.error('Planner AXL is not running. Start agents first: bash scripts/demo/run-all-agents.sh')
    process.exit(1)
  }
  const self = await selfRes.json() as { pubkey: string }
  console.log(`Planner AXL pubkey: ${self.pubkey}`)

  // 2. Send task via AXL
  const taskId = `demo-${Date.now()}`
  const payload = {
    service: 'plan',
    request: { query: 'What are the best DeFi yield opportunities for USDC right now? Include Aave, Uniswap, and Compound.' },
    requestId: taskId,
  }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')

  const sendRes = await fetch(`http://127.0.0.1:${PLANNER_AXL_PORT}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dst: self.pubkey, payload: payloadBase64 }),
  })

  if (sendRes.ok) {
    console.log(`\n✓ Task ${taskId} sent to planner!`)
    console.log('\nWatch the agent logs for task processing:')
    console.log('  tail -f logs/planner.log')
    console.log('  tail -f logs/researcher.log')
    console.log('  tail -f logs/evaluator.log')
    console.log('\nOr watch the dashboard: pnpm --filter @neuralmesh/dashboard dev')
  } else {
    console.error('Failed to send task:', await sendRes.text())
  }
}

void sendDemoTask()
