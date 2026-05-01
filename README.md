# NeuralMesh — Self-Evolving Decentralized AI Agent Economy

> ETHGlobal Open Agents Hackathon 2026 submission

NeuralMesh is a protocol where autonomous AI agents discover each other via ENS, communicate over Gensyn AXL, execute via KeeperHub, and permanently evolve through 0G fine-tuning — storing LoRA adapters as on-chain iNFT assets.

---

## Architecture

```
                         ┌─────────────────────────────────────────┐
                         │            NeuralMesh Mesh               │
                         │                                          │
  User Task              │  ┌─────────┐     ┌────────────┐         │
  ──────────►  Planner ──┼──► Researcher ──► Evaluator   │         │
                         │  └─────────┘  │  └────────────┘         │
                         │               │                          │
                         │            ┌──▼──────┐                   │
                         │            │Executor │                   │
                         │            └─────────┘                   │
                         │                                          │
                         │  ┌──────────────────────────────────┐   │
                         │  │ Evolution Agent (always-on)       │   │
                         │  │  Monitors training buffers        │   │
                         │  │  Fine-tunes via 0G               │   │
                         │  │  Updates iNFTs + ENS records     │   │
                         │  └──────────────────────────────────┘   │
                         └─────────────────────────────────────────┘

Discovery:  ENS (neuralmesh.eth subnames on Sepolia)
Transport:  Gensyn AXL (ed25519 identity, Yggdrasil overlay)
Execution:  KeeperHub (5 automated workflows)
Memory:     0G Storage (KV store + file uploads)
Evolution:  0G Fine-tuning → LoRA stored as ERC-7857 iNFT
Payments:   x402 micropayments via KeeperHub Turnkey wallet
```

---

## The 5 Agents

| Agent | ENS Name | Role | Evolves |
|-------|----------|------|---------|
| Planner | `planner.neuralmesh.eth` | Decomposes tasks, orchestrates other agents | No |
| Researcher | `researcher.neuralmesh.eth` | DeFi data research, RAG over 0G | Yes (threshold 50) |
| Executor | `executor.neuralmesh.eth` | On-chain tx execution via KeeperHub | No |
| Evaluator | `evaluator.neuralmesh.eth` | Scores results, writes ENS reputation | No |
| Evolution | `evolution.neuralmesh.eth` | Fine-tunes agents, manages LoRA iNFTs | No |

---

## Quick Start (5 commands)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env and fill in your keys
cp .env.example .env

# 3. Generate AXL identity keys (one-time)
bash scripts/setup/01-generate-axl-keys.sh

# 4. Build all packages
pnpm build

# 5. Start all 5 agents
bash scripts/demo/run-all-agents.sh
```

Then send a demo task:
```bash
pnpm tsx scripts/demo/send-demo-task.ts
```

Watch the dashboard:
```bash
pnpm --filter @neuralmesh/dashboard dev
# → http://localhost:5173
```

---

## Prerequisites

- Node.js >= 22 (required by 0G fine-tuning CLI)
- Go 1.25.x (NOT 1.26+ — gVisor build tag conflict)
- pnpm >= 9.15.4
- openssl (for ed25519 key generation)

Check all deps:
```bash
bash scripts/setup/00-check-deps.sh
```

---

## Environment Variables

See [.env.example](.env.example) for the full list. Critical ones:

| Variable | Description |
|----------|-------------|
| `ZG_RPC_URL` | 0G Galileo RPC (chain 16602) |
| `ZG_STORAGE_NODE_URL` | 0G Storage indexer URL (for file uploads) |
| `ZG_STORAGE_KV_NODE_URL` | 0G Storage KV node URL (different endpoint!) |
| `SEPOLIA_RPC_URL` | Sepolia for ENS resolution |
| `PRIVATE_KEY` | Deployer key (funds on Galileo + Sepolia) |
| `INFT_CONTRACT` | `0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F` |
| `NEURALMESH_REGISTRY` | Deployed NeuralMeshRegistry on Galileo |
| `NEURALMESH_RESOLVER` | Deployed NeuralMeshResolver on Sepolia |

---

## Deployed Contracts

| Contract | Network | Address |
|----------|---------|---------|
| NeuralMeshRegistry | 0G Galileo (16602) | see `packages/contracts/deployments/galileo.json` |
| NeuralMeshResolver | Sepolia | see `packages/contracts/deployments/sepolia.json` |
| ERC-7857 iNFT | 0G Galileo (16602) | `0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F` |

Deploy contracts:
```bash
cd packages/contracts
pnpm hardhat run scripts/deploy-registry.ts --network galileo
pnpm hardhat run scripts/deploy-resolver.ts --network sepolia
```

---

## Partner Integrations

| Partner | What We Use | Where |
|---------|-------------|-------|
| **Gensyn AXL** | ed25519 agent identity + encrypted P2P transport | All inter-agent communication |
| **KeeperHub** | 5 automated workflows: health, DeFi monitor, on-chain executor, evolution trigger, payment settle | `workflows/` + `packages/sdk/src/execution/KeeperHub.ts` |
| **0G Storage** | Agent state KV store, training data, LoRA model files | `packages/sdk/src/memory/` |
| **0G Fine-tuning** | Qwen2.5-0.5B-Instruct LoRA training on agent interaction data | `packages/sdk/src/intelligence/FineTuner.ts` |
| **0G Compute** | GLM-5-FP8 sealed inference for agent cognition | `packages/sdk/src/intelligence/Compute.ts` |
| **ERC-7857 iNFT** | Agent identity + LoRA checkpoint storage as NFTs | `packages/sdk/src/identity/iNFT.ts` |
| **ENS** | Human-readable agent names + discovery metadata | `packages/sdk/src/discovery/ENSResolver.ts` |
| **x402** | Micropayments between agents for services | `packages/sdk/src/execution/AgenticWallet.ts` |

---

## Novel Primitives

**1. LoRA-as-iNFT:** Each time a researcher agent evolves (fine-tuning on 50+ real interactions), a new ERC-7857 iNFT is minted on 0G Galileo. The iNFT's `encryptedURI` points to the LoRA adapter root on 0G Storage. The agent's ENS text record `neural-version` is updated atomically. Any consumer verifying the agent's identity can fetch the iNFT, decrypt the URI, and download the exact model weights the agent is running.

**2. ENS-native agent discovery:** Agents don't need a central registry to find each other. `researcher.neuralmesh.eth` resolves to an AXL pubkey via ENS text record `axl-pubkey`. Any agent that can resolve ENS can connect to any other agent. No API key, no central server.

**3. AXL multiplexed transport:** A single AXL connection handles three protocol channels simultaneously via JSON discriminators: `{"service":"..."}` routes to MCP handlers, `{"a2a":true}` routes to A2A protocol, `{"neuralmesh":true}` routes to the mesh message queue. This lets the same connection serve tool calls, agent-to-agent protocol, and pub/sub broadcasts.

**4. Convergecast pattern:** When the planner needs results from multiple agents simultaneously, it broadcasts a query and waits for all responses with a deadline. Unlike sequential calls, this gives O(1) latency for N agents.

---

## Project Structure

```
packages/
  contracts/          — Solidity contracts (NeuralMeshRegistry, NeuralMeshResolver)
  axl-go/             — Go wrapper that spawns the AXL binary
  sdk/                — TypeScript SDK (NeuralMesh.create() factory)
  agents/
    planner/          — Task decomposition agent
    researcher/       — DeFi research agent (evolves)
    executor/         — On-chain execution agent
    evaluator/        — Result scoring + ENS reputation agent
    evolution/        — Fine-tuning orchestration agent
    shared/           — Shared types and base agent creator
  dashboard/          — React + D3 mesh topology dashboard
workflows/            — KeeperHub workflow JSON definitions
scripts/
  setup/              — Dependency checks, key generation
  demo/               — Run/stop/send demo
docs/
  FEEDBACK.md         — KeeperHub integration feedback (bounty)
```

---

## AI Attribution

This project uses AI-assisted development:
- **Architecture design:** Claude Sonnet 4.6 (Anthropic)
- **Code generation:** Claude Sonnet 4.6 (Anthropic)
- **Agent inference at runtime:** GLM-5-FP8 via 0G Compute (sealed inference)
- **Agent evolution:** Qwen2.5-0.5B-Instruct fine-tuned via 0G Fine-tuning

All generated code has been reviewed and the architecture decisions are the team's own.

---

## License

MIT
