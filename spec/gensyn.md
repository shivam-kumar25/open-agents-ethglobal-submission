# Gensyn AXL Integration Spec

## Overview

NeuralMesh uses Gensyn's AXL library for all agent-to-agent communication. AXL provides:
- **Encrypted channels**: all messages between agents are end-to-end encrypted
- **Authenticated identity**: each agent's ed25519 keypair is its cryptographic identity
- **P2P transport**: agents connect directly — no central relay server
- **MCP protocol**: service call / response pattern for agent tasks

---

## AXL Binary

Location: `packages/axl-go/`
Build output: `packages/axl-go/bin/axl-agent`

Go version requirement: **1.25.x exactly** (gVisor build tag conflict in Go 1.26+)

```bash
cd packages/axl-go && make build
```

---

## Per-Agent Configuration

Each agent runs one AXL subprocess:

| Agent | API Port | TCP Port | Key Path |
|-------|----------|----------|----------|
| planner | 9002 | 7000 | `packages/agents/shared/axl-keys/planner.pem` |
| researcher | 9012 | 7001 | `packages/agents/shared/axl-keys/researcher.pem` |
| executor | 9022 | 7002 | `packages/agents/shared/axl-keys/executor.pem` |
| evaluator | 9032 | 7003 | `packages/agents/shared/axl-keys/evaluator.pem` |
| evolution | 9042 | 7004 | `packages/agents/shared/axl-keys/evolution.pem` |

The API port is the HTTP bridge (TypeScript → AXL). The TCP port is the Yggdrasil P2P layer (AXL → AXL). These are separate systems.

Keys are generated with:
```bash
pnpm keys
```
This uses Node.js built-in `crypto.generateKeyPairSync('ed25519')` — no openssl or WSL required.

---

## AXL Subprocess Lifecycle

`NeuralMesh.create()` calls `startAxlSubprocess()`:

1. Spawns `packages/axl-go/bin/axl-agent` with env vars:
   - `AXL_API_PORT` = config.axlApiPort
   - `AXL_KEY_PATH` = config.axlKeyPath
   - `AGENT_NAME` = config.name

2. Watches stdout for `READY:{pubkey}` line (30s timeout)

3. Returns pubkey string → stored in agent state and written to ENS `axl-pubkey` text record

If binary not found: agent starts in "offline" mode with warning. All core logic still works, P2P mesh is unavailable.

---

## AXLClient SDK Class

File: `packages/sdk/src/mesh/AXLClient.ts`

### HTTP Bridge Endpoints

```
GET  /api/self           → { pubkey, name, services }
GET  /api/peers          → [{ pubkey, name }]
POST /api/send           → { to: pubkey, payload: {...} }
GET  /api/recv           → [{ from: pubkey, payload: {...} }]  (long-poll)
```

### Key Method: mcpCall()

```typescript
async mcpCall(
  dstPubkey: string,
  service: string,
  args: Record<string, unknown>
): Promise<unknown>
```

Sends a typed RPC request to a remote agent and awaits the response.

**Race condition fix:** Uses a `pendingRequests` Map keyed by `requestId`. The `startRecvLoop` polls messages and routes response messages directly to the waiting Promise — preventing the issue where two concurrent mcpCalls could receive each other's responses.

```
mcpCall('pubkey123', 'research', { query: '...' })
  → generate requestId = 'req-1234567-abc'
  → POST /api/send { to: 'pubkey123', payload: { service: 'research', request: {...}, requestId } }
  → pendingRequests.set(requestId, resolve/reject)
  → startRecvLoop receives message with matching requestId
  → routes to correct Promise
```

### Key Method: serve()

```typescript
serve(service: string, handler: (args, meta) => Promise<unknown>): void
```

Registers a service handler. When the recv loop receives a message with `payload.service === service`, it calls the handler and sends back the result with the original `requestId`.

---

## Communication Patterns Used

### 1. MCP Service Call (request/response)

```
Planner → Researcher: { service: 'research', request: { query: '...' }, requestId: 'req-...' }
Researcher → Planner: { response: '...', requestId: 'req-...' }
```

Used for: task delegation (planner→researcher, planner→evaluator)

### 2. GossipSub Broadcast

File: `packages/sdk/src/mesh/GossipSub.ts`

```typescript
gossip.publish('evolution-complete', { agentName, fromVersion, toVersion, timestamp })
gossip.subscribe('evolution-complete', (payload) => { ... })
```

Used for: evolution events, task completion broadcasts, mesh health status

### 3. Fire-and-Forget Send

```typescript
axl.send(pubkey, { type: 'ping', ts: Date.now() })
```

Used for: keepalive pings, status updates

---

## Cryptographic Identity

- Each agent's ed25519 keypair is generated once via `pnpm keys`
- The public key is published to ENS `axl-pubkey` text record
- AXL uses this keypair to authenticate every message
- **The ENS text record IS the agent's identity proof** — anyone can verify who they're talking to by checking ENS

This means: if an attacker wanted to impersonate `researcher.neuralmesh.eth`, they'd need to (a) own the ENS name on Ethereum AND (b) have the corresponding AXL private key.

---

## Failure Modes

| Failure | Behavior |
|---------|---------|
| AXL binary not built | Agent starts with warning: "cd packages/axl-go && make build". Axl pubkey set to `'offline'`. ENS axl-pubkey not updated. |
| AXL startup timeout (30s) | Same as above — graceful degradation |
| Peer not reachable via AXL | `mcpCall` times out after 30s with descriptive error. Agent logs which peer failed. |
| AXL process crashes | `startRecvLoop` detects EOF and logs error. Next send attempt will fail with clear message. |

---

## What This Demonstrates for Gensyn Judges

1. **AXL as production P2P layer** — five separate processes communicating via AXL, with proper key management and lifecycle
2. **Solving the service discovery problem** — combining AXL (transport) with ENS (registry) creates a complete agent communication system
3. **Authenticated MCP calls** — each RPC is cryptographically authenticated via ed25519; the `requestId` pattern solves concurrent call routing
4. **GossipSub at the application layer** — mesh-wide event propagation without a central broker
5. **Graceful degradation** — system functions without AXL binary, with clear messaging about what's missing
