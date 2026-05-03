import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

export function startHealthServer(agentName: string, axlApiPort: number): void {
  const healthPort = axlApiPort + 1

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    if (req.url === '/api/self') {
      res.writeHead(200)
      res.end(JSON.stringify({ name: agentName, pubkey: '', online: true }))
      return
    }

    if (req.url === '/api/peers') {
      res.writeHead(200)
      res.end(JSON.stringify({ peers: [] }))
      return
    }

    res.writeHead(404); res.end()
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[${agentName}] Health server port :${healthPort} already in use — retrying in 3s`)
      setTimeout(() => server.listen(healthPort, '127.0.0.1'), 3000)
    } else {
      console.error(`[${agentName}] Health server error:`, err.message)
    }
  })

  server.listen(healthPort, '127.0.0.1', () => {
    console.log(`[${agentName}] Health server on :${healthPort}`)
  })
}
