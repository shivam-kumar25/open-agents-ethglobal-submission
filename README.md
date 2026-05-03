# NeuralMesh

> AI agents that find each other on Ethereum, talk directly over an encrypted mesh, pay each other in crypto, and coordinate their work automatically — with no central server and every identity verifiable on-chain.

Built at ETHGlobal Open Agents Hackathon 2026.

**Sponsors used: ENS · Gensyn · KeeperHub**

---

## What Is This?

Five specialized AI agents collaborate on research and analysis tasks. They discover each other by name on Ethereum (ENS), communicate directly via Gensyn's encrypted P2P network (AXL), and automate payments and monitoring via KeeperHub workflows.

```
  You submit a question
         │
         ▼
  planner.neuralmesh.eth     ← receives your question
         │ resolves researcher.neuralmesh.eth on ENS → gets AXL pubkey
         │ connects directly via AXL (encrypted, no server)
         ▼
  researcher.neuralmesh.eth  ← thinks about your question using AI
         │ returns answer
         ▼
  planner pays researcher $0.01 USDC (KeeperHub x402)
         │
         ▼
  evaluator.neuralmesh.eth   ← scores the answer (0–100)
         │ writes score to Ethereum: researcher's ENS reputation updated
         ▼
  You get the answer + quality score
  Dashboard shows: "Reputation updated on Ethereum"
```

**Every arrow is encrypted peer-to-peer. Agent identities are ENS names on Ethereum.**

---

## How Each Sponsor Is Used

### ENS (Ethereum Name Service)

- Each agent has a `*.neuralmesh.eth` subname on Sepolia
- `NeuralMeshResolver.sol` (custom ENS resolver) programmatically issues subnames via `issueSubname()`
- ENS text records store live agent metadata: AXL public key, version, reputation score, task count
- Agents resolve peers by ENS name → read `axl-pubkey` text record → connect via AXL
- The evaluator writes reputation updates to ENS after every scored task
- The evolution agent bumps the `neural-version` text record when the task threshold is crossed

This solves AXL's documented limitation: "there is no built-in service registry — keys must be exchanged manually." ENS is the registry.

### Gensyn AXL

- All 5 agents communicate exclusively via AXL encrypted P2P channels
- Each agent runs an AXL subprocess (Go binary) with an ed25519 keypair
- The keypair's public key is published to ENS — this is the agent's cryptographic identity
- `AXLClient.mcpCall()` — typed RPC between agents with proper concurrent-call handling
- `GossipSub` — mesh-wide broadcast for evolution events and task completions
- Graceful degradation: agents start without the AXL binary, with clear instructions

### KeeperHub

- Three automated workflows: health monitoring (every 5 min), evolution trigger (on task count threshold), payment settlement
- `AgenticWallet` — x402 micropayments: planner pays researcher $0.01 USDC per task via KeeperHub Turnkey wallet
- Evaluator fires a KeeperHub webhook after each task; KeeperHub decides whether to trigger evolution
- Feedback on KeeperHub's UX and docs: `docs/FEEDBACK.md`

---

## The 5 Agents

| Agent | ENS Name | Port | Role |
|-------|----------|------|------|
| Planner | `planner.neuralmesh.eth` | 9002 | Receives questions, decomposes tasks, hires specialists, routes payments |
| Researcher | `researcher.neuralmesh.eth` | 9012 | Fetches DeFi data, synthesizes AI answers, earns USDC per task |
| Executor | `executor.neuralmesh.eth` | 9022 | Executes transactions via KeeperHub MEV-protected workflows |
| Evaluator | `evaluator.neuralmesh.eth` | 9032 | Scores answer quality, writes reputation to ENS |
| Evolution | `evolution.neuralmesh.eth` | 9042 | Bumps ENS version when task threshold is crossed |

---

## Quick Start

### Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 22 | |
| pnpm | >= 9.15.4 | `npm i -g pnpm` |
| Go | 1.25.x | For AXL binary. **Not 1.26+** (build tag conflict) |

Check all at once: `pnpm check`

---

### Step 1 — Install

```bash
pnpm install
```

### Step 2 — Configure

```bash
cp .env.example .env
```

Minimum to get started (one free key):
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TOKENROUTER_API_KEY=your_tokenrouter_key
```

- **Sepolia RPC**: free at [dashboard.alchemy.com](https://dashboard.alchemy.com) → Create App → Ethereum → Sepolia
- **TokenRouter**: get credits at [tokenrouter.com](https://tokenrouter.com)

Everything else is optional — agents start in degraded mode and tell you exactly what's missing.

### Step 3 — Generate AXL identity keys

```bash
pnpm keys
```

Generates an ed25519 keypair for each agent. No openssl needed — uses Node.js built-in crypto.

### Step 4 — Build

```bash
pnpm build
```

### Step 5 — Start agents

```bash
pnpm start:agents
```

Each agent prints a capability report showing what's working and what's missing.

### Step 6 — Open the dashboard

```bash
pnpm dashboard
```

Open [http://localhost:3000](http://localhost:3000).

Submit a question like *"What are the best DeFi yields for USDC right now?"* and watch the agent pipeline execute in real time.

---

## Building the AXL Binary

Required for real encrypted P2P communication between agents. Without it, agents start but the mesh is offline.

```bash
cd packages/axl-go && make build
```

Go version: **1.25.x exactly**. Install from [go.dev/dl](https://go.dev/dl) and pick 1.25.x.

Verify after building:
```bash
curl http://127.0.0.1:9003/api/self   # {"pubkey":"...","name":"planner",...}
```

---

## Verify It's Working

```bash
# 1. All agents alive?
curl http://127.0.0.1:9003/api/self   # planner
curl http://127.0.0.1:9013/api/self   # researcher

# 2. ENS resolution?
pnpm tsx -e "
  import { ENSResolver } from './packages/sdk/src/index.ts'
  const ens = new ENSResolver(process.env.SEPOLIA_RPC_URL)
  console.log(await ens.resolve('researcher.neuralmesh.eth'))
"

# 3. Send a task directly
curl -X POST http://127.0.0.1:9003/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is the current Aave V3 USDC yield?"}'
```

---

## Project Structure

```
neuralmesh/
├── spec/                       Architecture specs (ENS, Gensyn, KeeperHub)
├── packages/
│   ├── contracts/              NeuralMeshResolver.sol (Sepolia ENS resolver)
│   │   ├── src/
│   │   └── scripts/
│   │       ├── deploy-resolver.ts   Deploy NeuralMeshResolver to Sepolia
│   │       └── issue-subnames.ts    Register all 5 agents as *.neuralmesh.eth
│   ├── axl-go/                 AXL P2P node (Go binary)
│   ├── sdk/                    TypeScript SDK — NeuralMesh.create() factory
│   │   └── src/
│   │       ├── agent/          Agent config, state, capability checker
│   │       ├── discovery/      ENSResolver
│   │       ├── mesh/           AXLClient, GossipSub, Convergecast
│   │       ├── memory/         LocalStore (JSON file storage)
│   │       ├── intelligence/   Compute (TokenRouter wrapper)
│   │       ├── execution/      KeeperHub, AgenticWallet
│   │       └── evolution/      EvolutionLoop (ENS version bump + gossip)
│   └── agents/
│       ├── planner/            Orchestrator + HTTP server on port 9003
│       ├── researcher/         DeFi research agent
│       ├── executor/           Transaction execution agent
│       ├── evaluator/          Quality scoring agent
│       ├── evolution/          Version management agent
│       └── shared/             Startup logic, types
│   └── dashboard/              React web UI
├── workflows/                  KeeperHub workflow JSON files
├── docs/
│   └── FEEDBACK.md             KeeperHub integration feedback
└── .env.example                All environment variables documented
```

---

## Deployed Contracts

| Contract | Network | Explorer |
|----------|---------|---------|
| NeuralMeshResolver | Sepolia (11155111) | see `packages/contracts/deployments/sepolia.json` |

Deploy yourself:
```bash
pnpm --filter @neuralmesh/contracts run deploy:resolver
pnpm --filter @neuralmesh/contracts run issue:subnames
```

---

## Feature Status

| Feature | Status | Requires |
|---------|--------|---------|
| Agent startup + capability reports | ✓ Working | Node.js 22 |
| ENS name resolution | ✓ Working | `SEPOLIA_RPC_URL` |
| AXL P2P mesh | ✓ Working | AXL binary (Go 1.25.x) |
| AI inference | ✓ Working | `TOKENROUTER_API_KEY` |
| Dashboard task round-trip | ✓ Working | Above + AXL binary |
| x402 micropayments | ✓ Working | `KEEPERHUB_API_KEY` + `KEEPERHUB_WALLET_ADDRESS` |
| ENS reputation writes | ✓ Working | `PRIVATE_KEY` + `SEPOLIA_RPC_URL` |
| KeeperHub workflow automation | ✓ Working | `KEEPERHUB_API_KEY` |
| ENS subname issuance | ✓ Working | `NEURALMESH_RESOLVER` + `PRIVATE_KEY` |
| Evolution version bump | ✓ Working | `PRIVATE_KEY` + `SEPOLIA_RPC_URL` |

---

## Two Novel Ideas

**1. ENS as AXL's service registry**

AXL's docs say: *"There is no built-in service registry. Keys must be exchanged out-of-band."* NeuralMesh solves this by storing AXL public keys in ENS text records. Any agent resolves any other by name. No manual key exchange. This works at any scale — just register a new `*.neuralmesh.eth` subname.

**2. KeeperHub as the automation backbone**

Instead of cron jobs or polling loops in agent code, all periodic tasks are declarative KeeperHub workflows. Agents are stateless with respect to scheduling. The evaluator fires a webhook; KeeperHub decides whether to trigger evolution. This separation of concerns makes the system auditable and observable.

---

## AI Tools Attribution

Built with Claude Code (claude-sonnet-4-6) using spec-driven development.

**What Claude helped with:** TypeScript SDK, React dashboard, Hardhat scripts, cross-platform setup scripts.

**What the human designed:** The core architecture (ENS as AXL registry), the three-sponsor integration design, which contracts to deploy and why, all architectural decisions.

**Runtime AI:** Agents use `meta-llama/Llama-3.1-8B-Instruct` via TokenRouter for inference.

---

## License

MIT
