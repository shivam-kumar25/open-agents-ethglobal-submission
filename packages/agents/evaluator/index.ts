import 'dotenv/config'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { ENSResolver } from '@neuralmesh/sdk'
import { createBaseAgent, startHealthServer } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { startEvaluator, runEvaluation } from './evaluator.js'

function startEvaluatorHttpServer(
  agent: Parameters<typeof runEvaluation>[0],
  ens: ENSResolver,
): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    if (req.method === 'POST' && req.url === '/evaluate') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const args = JSON.parse(body) as { taskId: string; query: string; result: string; targetAgent?: string }
          const evaluation = await runEvaluation(agent, ens, args)
          res.writeHead(200)
          res.end(JSON.stringify(evaluation))
        } catch (err) {
          res.writeHead(500)
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
      return
    }

    res.writeHead(404); res.end()
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('[evaluator] HTTP server error:', err.message)
  })

  server.listen(config.axlApiPort, '127.0.0.1', () => {
    console.log(`[evaluator] HTTP task server on :${config.axlApiPort}`)
  })
}

async function main() {
  console.log('[evaluator] Starting NeuralMesh Evaluator agent...')
  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
  })
  const sepoliaRpc = process.env['SEPOLIA_RPC_URL'] ?? 'https://rpc.sepolia.org'
  const ens = new ENSResolver(sepoliaRpc)
  console.log(`[evaluator] Started. ENS: ${config.ensName} | HTTP: :${config.axlApiPort}`)
  startEvaluatorHttpServer(agent, ens)
  startHealthServer(config.ensName, config.axlApiPort)
  await startEvaluator(agent, ens)
}

main().catch((err) => {
  console.error('[evaluator] Fatal error:', err)
  process.exit(1)
})
