# NeuralMesh Architecture

## What It Is

NeuralMesh is a network of five specialized AI agents that collaborate to research DeFi data, plan answers, execute transactions, and score result quality. Agents discover each other by name on Ethereum, talk directly over an encrypted P2P mesh, and automate payments and monitoring through programmable workflows.

Every step is verifiable: agent identity lives on ENS (Ethereum), communication is authenticated via Gensyn AXL ed25519 keypairs, and automation runs via KeeperHub.

---

## Sponsors and What We Use

| Sponsor | Integration |
|---------|------------|
| **ENS** | Agent identity via `*.neuralmesh.eth` subnames. Text records store AXL pubkey, version, reputation, and task count. Agents discover peers by resolving ENS names — no central directory. `NeuralMeshResolver.sol` (Sepolia) programmatically issues subnames. |
| **Gensyn AXL** | Encrypted P2P mesh between all 5 agents. Each agent runs an AXL subprocess with an ed25519 keypair. AXL provides authenticated channels — the keypair in ENS is the cryptographic proof of identity. GossipSub broadcasts task completions and version bumps across the mesh. |
| **KeeperHub** | Three automated workflows: agent health monitoring (every 5 min), evolution version trigger (fires when task count crosses threshold), and x402 micropayment routing between agents. AgenticWallet handles USDC payments on Base. |
| **TokenRouter** | OpenAI-compatible AI inference gateway at `tokenrouter.com`. All agents call the same API. Env: `TOKENROUTER_API_KEY`, `TOKENROUTER_BASE_URL`, `TOKENROUTER_MODEL`. |

---

## Agents

```
planner.neuralmesh.eth    — receives tasks, decomposes them, hires specialists
researcher.neuralmesh.eth — fetches live DeFi data + AI synthesis
executor.neuralmesh.eth   — executes transactions via KeeperHub workflows
evaluator.neuralmesh.eth  — scores quality, writes reputation to ENS
evolution.neuralmesh.eth  — monitors mesh, triggers ENS version bumps
```

Each agent has:
- An ENS subname under `neuralmesh.eth`
- An AXL ed25519 keypair (stored in `packages/agents/shared/axl-keys/`)
- An HTTP bridge port (9002 / 9012 / 9022 / 9032 / 9042)

---

## Task Data Flow

```
User
  │  HTTP POST /api/tasks
  ▼
Planner (port 9003 HTTP server)
  │  ENS resolve: researcher.neuralmesh.eth → axl-pubkey text record
  │  AXL: send research request
  ▼
Researcher
  │  TokenRouter: AI inference (Llama-3.1-8B-Instruct)
  │  Return result
  ▼
Planner
  │  KeeperHub x402: pay researcher $0.01 USDC
  │  AXL: send evaluation request to evaluator
  ▼
Evaluator
  │  Score result (0-100)
  │  ENS setText: update neural-reputation, neural-tasks for researcher
  ▼
Planner
  │  Return final answer + quality score to dashboard
  ▼
Dashboard
  │  Show answer + "Verified on-chain: ENS reputation updated"
```

---

## Architecture Layers

### Layer 1: Identity (ENS on Sepolia)

- `NeuralMeshResolver.sol` is a custom ENS resolver deployed on Sepolia
- `issueSubname(label, owner, tokenId, axlPubkey)` — called once to register each agent
- Text records written per task completion:
  - `axl-pubkey` — agent's Gensyn AXL public key (immutable after registration)
  - `neural-version` — semantic version e.g. `v1.3.0` (bumped by evolution agent)
  - `neural-reputation` — float 0.0–1.0 (updated by evaluator after each task)
  - `neural-tasks` — total completed task count
  - `neural-model` — model identifier in use

### Layer 2: Communication (Gensyn AXL)

- AXL binary (Go) in `packages/axl-go/` — builds to `packages/axl-go/bin/axl-agent`
- One AXL subprocess per agent, started by `NeuralMesh.create()`
- HTTP bridge: TypeScript talks to AXL via `http://127.0.0.1:{axlApiPort}`
- `AXLClient.mcpCall()` — RPC with pending request map to avoid race conditions
- `GossipSub` — pubsub broadcast layer on top of AXL for mesh-wide events

### Layer 3: AI Compute (TokenRouter)

- `packages/sdk/src/intelligence/Compute.ts` — thin wrapper around OpenAI SDK
- `baseURL` = `TOKENROUTER_BASE_URL` (default: `https://api.tokenrouter.com/v1`)
- `model` = `TOKENROUTER_MODEL` (default: `meta-llama/Llama-3.1-8B-Instruct`)
- No sealed inference, no provider wallet — just a standard API key

### Layer 4: Automation (KeeperHub)

- `packages/sdk/src/execution/KeeperHub.ts` — API client
- `packages/sdk/src/execution/AgenticWallet.ts` — x402 micropayment interface
- Workflows in `workflows/` (JSON) define the automation logic
- Three workflows: `health-monitor.json`, `evolution-trigger.json`, `payment-settlement.json`

### Layer 5: Local Storage

- `packages/sdk/src/memory/LocalStore.ts` — replaces all network storage
- Stores task logs and training examples as JSON files in `.neuralmesh/{agentName}/`
- No external service required
- ENS is the authoritative source for all cross-agent state

---

## Contracts

| Contract | Network | Purpose |
|----------|---------|---------|
| `NeuralMeshResolver` | Sepolia | Custom ENS resolver for `*.neuralmesh.eth`. Issues subnames, stores agent metadata in text records. |

Deployment: `packages/contracts/deployments/sepolia.json`

---

## Startup Sequence

```
1. NeuralMesh.create(config)
2. Spawn AXL subprocess → wait for READY:{pubkey}
3. ENSResolver.resolve(agentName) → load version/reputation from ENS
4. If hasWallet AND axlPubkey changed → ENS setText(axl-pubkey, ...)
5. Start GossipSub on AXL
6. Return Agent instance
```

---

## What Makes This Novel

**ENS as AXL's missing service registry:** The Gensyn AXL documentation explicitly states there is no built-in service registry — public keys must be exchanged manually. NeuralMesh uses ENS text records to publish AXL public keys on-chain. Any agent resolves any other agent's connection details from a name like `researcher.neuralmesh.eth`. This is the first known use of ENS as a dynamic P2P service registry.

**KeeperHub as the automation backbone:** Rather than running cron jobs or polling loops, all periodic tasks (health checks, evolution triggers, payment settlement) are declarative KeeperHub workflows. Agents are stateless with respect to scheduling — KeeperHub drives the clock.
