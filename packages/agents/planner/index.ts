import 'dotenv/config'
import { createServer } from 'node:http'
import { createBaseAgent } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { runPlannerLoop, planTask } from './planner.js'

const TASK_PORT = parseInt(process.env['PLANNER_TASK_PORT'] ?? '9003', 10)

async function main() {
  console.log('[planner] Starting NeuralMesh Planner agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
    evolve: false,
  })
  console.log(`[planner] Started. ENS: ${config.ensName} | AXL: :${config.axlApiPort}`)

  // HTTP task server — dashboard POSTs tasks here, gets full result back
  const taskServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/self')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', name: config.ensName, pubkey: '', online: true }))
      return
    }

    if (req.method === 'GET' && req.url === '/api/peers') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ peers: [] }))
      return
    }

    if (req.method === 'POST' && req.url === '/api/tasks') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        let query = ''
        try { query = (JSON.parse(body) as { query?: string }).query ?? '' } catch { /* ignore */ }
        if (!query.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'query is required' }))
          return
        }
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        console.log(`[planner-http] ${taskId}: "${query.slice(0, 60)}"`)
        planTask(agent, query, taskId).then((result) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        }).catch((err: Error) => {
          console.error('[planner-http] Task failed:', err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        })
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/tasks/stream') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        let query = ''
        try { query = (JSON.parse(body) as { query?: string }).query ?? '' } catch { /* ignore */ }
        if (!query.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'query is required' }))
          return
        }
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        console.log(`[planner-sse] ${taskId}: "${query.slice(0, 60)}"`)

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        })

        const send = (data: object) => {
          try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch { /* client gone */ }
        }

        const heartbeat = setInterval(() => {
          try { res.write(': ping\n\n') } catch { clearInterval(heartbeat) }
        }, 15_000)

        planTask(agent, query, taskId, (step, detail) => {
          send({ type: 'step', step, detail, ts: Date.now() })
        }).then((result) => {
          clearInterval(heartbeat)
          send({ type: 'done', result })
          res.end()
        }).catch((err: Error) => {
          clearInterval(heartbeat)
          console.error('[planner-sse] Task failed:', err)
          send({ type: 'error', error: err.message })
          res.end()
        })
      })
      return
    }

    res.writeHead(404); res.end()
  })

  taskServer.listen(TASK_PORT, '127.0.0.1', () => {
    console.log(`[planner] Task HTTP server on :${TASK_PORT}`)
  })

  await runPlannerLoop(agent)
}

main().catch((err) => {
  console.error('[planner] Fatal error:', err)
  process.exit(1)
})
