import 'dotenv/config'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createBaseAgent, startHealthServer } from '@neuralmesh/agent-shared'
import { config } from './config.js'
import { startResearcher } from './researcher.js'
import type { Agent } from '@neuralmesh/sdk'

function startResearchHttpServer(agent: Agent): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    if (req.method === 'POST' && req.url === '/research') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const { query, taskId } = JSON.parse(body) as { query: string; taskId: string }
          const result = await agent.think(
            `Research query: ${query}`,
            { systemPrompt: 'You are a research agent. Give accurate, well-reasoned, concise answers. Include specific facts, numbers, and comparisons where relevant.' },
          )
          await agent.remember(`result:${taskId}`, { query, result, timestamp: Date.now() })
          await agent.log('training', { query, result, taskId })
          res.writeHead(200)
          res.end(JSON.stringify({ result }))
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
    console.error(`[researcher] HTTP server error:`, err.message)
  })

  server.listen(config.axlApiPort, '127.0.0.1', () => {
    console.log(`[researcher] HTTP task server on :${config.axlApiPort}`)
  })
}

async function main() {
  console.log('[researcher] Starting NeuralMesh Researcher agent...')

  const agent = await createBaseAgent({
    name: config.ensName,
    capabilities: config.capabilities,
    model: config.model,
    axlApiPort: config.axlApiPort,
    axlKeyPath: config.axlKeyPath,
    evolve: config.evolve,
    evolutionThreshold: config.evolutionThreshold,
  })

  console.log(`[researcher] Started. ENS: ${config.ensName} | HTTP: :${config.axlApiPort}`)
  console.log(`[researcher] Evolution threshold: ${config.evolutionThreshold} tasks`)
  startResearchHttpServer(agent)
  startHealthServer(config.ensName, config.axlApiPort)
  await startResearcher(agent)
}

main().catch((err) => {
  console.error('[researcher] Fatal error:', err)
  process.exit(1)
})
