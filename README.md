# NeuralMesh

> AI agents that find each other, talk to each other, pay each other, and teach themselves to get smarter — with no central server and every step verifiable on the blockchain.

Built at ETHGlobal Open Agents Hackathon 2026.

---

## What Is This? (Plain English)

Imagine 5 AI workers living on the internet. They have names (like email addresses), they can call each other directly without going through any company's server, they earn money when they do good work, and they use that money to make themselves smarter over time.

That's NeuralMesh.

```
  You type a question
         |
         v
  planner.neuralmesh.eth        ← receives your question
         |
         | (finds researcher by name, connects directly)
         v
  researcher.neuralmesh.eth     ← thinks about your question using AI
         |
         | (sends answer back, gets paid $0.01)
         v
  evaluator.neuralmesh.eth      ← scores the answer (like a teacher)
         |
         | (writes the score to the blockchain)
         v
  evolution.neuralmesh.eth      ← when enough tasks done, makes researcher smarter
         |
         | (trains a new AI model, stores it on the blockchain)
         v
  researcher is now version 2   ← same agent, actually smarter
```

**Every arrow in that diagram is encrypted peer-to-peer. No server in the middle.**

---

## How Each Partner Is Used

```
  WHAT THEY DO                     HOW WE USE IT
  ─────────────────────────────────────────────────────────────────
  ENS (Ethereum Name Service)
  Like a phone book for agents     Agents have names like
  on the blockchain                researcher.neuralmesh.eth
                                   The name stores: AXL connection key,
                                   AI version, reputation score, earnings
                                   Any agent can look up any other agent
                                   by name, with zero central registry

  Gensyn AXL
  Encrypted peer-to-peer           All 5 agents run as separate processes
  network for AI agents            They talk directly to each other
                                   5 communication patterns used:
                                   Send/Recv, MCP services, A2A protocol,
                                   GossipSub broadcasts, Convergecast

  0G (Zero Gravity)
  Decentralized AI infrastructure  Compute: agents think using 0G AI models
                                   Storage: agents remember using 0G storage
                                   Fine-tuning: agents improve on 0G GPUs
                                   iNFT: each agent's identity is an NFT
                                   Chain: contracts deployed on 0G Galileo

  KeeperHub
  Automated blockchain workflows   5 workflows handle: health monitoring,
                                   DeFi yield alerts, onchain execution,
                                   evolution triggering, payment settlement
                                   Agents pay each other $0.01 via x402
  ─────────────────────────────────────────────────────────────────
```

---

## The 5 Agents

| Agent | ENS Name | AXL Port | What It Does |
|-------|----------|----------|-------------|
| Planner | `planner.neuralmesh.eth` | :9002 | Receives your question, breaks it into tasks, hires the right specialists |
| Researcher | `researcher.neuralmesh.eth` | :9012 | Looks up DeFi data, answers research questions, gets smarter over time |
| Executor | `executor.neuralmesh.eth` | :9022 | Makes blockchain transactions happen reliably (through KeeperHub) |
| Evaluator | `evaluator.neuralmesh.eth` | :9032 | Scores every answer, updates reputation scores on-chain |
| Evolution | `evolution.neuralmesh.eth` | :9042 | Watches for when researcher has enough data, then triggers AI fine-tuning |

---

## Quick Start — 5 Commands

Run these one at a time. Each one has an expected output below it so you know it worked.

### Step 1 — Install dependencies

```bash
pnpm install
```

Expected output: `Done in ~60s` and no error messages.

---

### Step 2 — Copy the environment file

```bash
cp .env.example .env
```

Then open `.env` in a text editor. The only required field to get started is:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY_HERE
```
Get a free key at [dashboard.alchemy.com](https://dashboard.alchemy.com). Everything else is optional for the basic demo — agents will tell you what's missing and where to get it.

---

### Step 3 — Check dependencies

```bash
pnpm check
```

Expected output: a checklist showing Node.js, pnpm, Go, tsx, .env, and AXL keys. Fix anything marked with ✗ before continuing.

---

### Step 4 — Generate AXL identity keys

```bash
pnpm keys
```

Expected output:
```
╔══════════════════════════════════════════════════════════════╗
║         NeuralMesh — Generating AXL Identity Keys           ║
╚══════════════════════════════════════════════════════════════╝

  ✓  planner.pem    ─── generated
  ✓  researcher.pem ─── generated
  ✓  executor.pem   ─── generated
  ✓  evaluator.pem  ─── generated
  ✓  evolution.pem  ─── generated
```

These are private keys for each agent's peer-to-peer identity. They're in `.gitignore` — they stay on your machine. Uses Node.js built-in crypto — no openssl or WSL required.

---

### Step 5 — Build all packages

```bash
pnpm build
```

Expected output: `Tasks: 8 successful` with no errors. This compiles TypeScript for all packages — SDK, shared, all 5 agents, and the dashboard.

---

### Step 6 — Start all 5 agents

```bash
pnpm start:agents
```

Expected output:
```
╔══════════════════════════════════════════════════════════════╗
║         NeuralMesh — Starting All 5 Agents                  ║
╚══════════════════════════════════════════════════════════════╝

  ✓  planner      PID: 12345   │ Port: :9002 │ Orchestrator
  ✓  researcher   PID: 12346   │ Port: :9012 │ Knowledge agent
  ✓  executor     PID: 12347   │ Port: :9022 │ Action agent
  ✓  evaluator    PID: 12348   │ Port: :9032 │ Quality agent
  ✓  evolution    PID: 12349   │ Port: :9042 │ Meta-agent
```

Each agent prints a startup capability report to its log file. Check one:

```bash
# Mac / Linux
tail -f logs/planner.log

# Windows PowerShell
Get-Content logs/planner.log -Wait
```

You'll see something like:

```text
╔════════════════════════════════════════════════════════════╗
║  NeuralMesh Agent                                          ║
║  planner.neuralmesh.eth                                    ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  CAPABILITY REPORT                                         ║
║  ────────────────────────────────────────────────────────  ║
║  ✓  AXL mesh (P2P)       always available                  ║
║  ✓  ENS discovery        Sepolia connected                 ║
║  ✗  0G Compute (AI)      ZG_COMPUTE_API_KEY missing        ║
║  ✗  0G Storage (mem)     ZG_STORAGE_NODE_URL missing       ║
║  ✓  KeeperHub (exec)     workflows ready                   ║
║  ✗  0G Chain / iNFT      PRIVATE_KEY missing               ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  Mode: DEGRADED  (3/6 capabilities active)                 ║
╚════════════════════════════════════════════════════════════╝
```

This tells you exactly what works and what's missing. The agent still runs — it just can't use the disabled features.

---

### Open the Dashboard

```bash
pnpm dashboard
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

You'll see:

- All 5 agents with green/gray online indicators
- A task submission box (type a question, click Submit)
- A live mesh topology diagram showing how agents are connected
- An evolution progress bar for the researcher agent

---

### Send a Demo Task

```bash
pnpm demo
```

Or use the dashboard's task box — type your question and click "Submit to Planner".

---

### Stop All Agents

```bash
pnpm stop
```

---

## What You'll See When a Task Runs

When you submit a question like "What are the best DeFi yields for USDC?", here's what happens in about 10–20 seconds:

```text
14:23:01  planner received task from you
          Running inference to understand the question...
          Breaking it into subtasks: [research yields, set up monitor]

14:23:03  planner looked up researcher.neuralmesh.eth on ENS
          Got AXL public key: 1ee862344fb2833c...
          Connected directly via AXL (no server, fully encrypted)

14:23:04  researcher.neuralmesh.eth received the research task
          Running 0G Compute AI inference (qwen-2.5-7b)...
          Checking: Aave V3, Compound V3, Morpho Blue, Spark...

14:23:07  researcher returned results:
          Morpho Blue: 6.1% APY
          Aave V3:     5.2% APY
          Compound V3: 4.8% APY

14:23:08  planner paid researcher $0.01 USDC via KeeperHub x402
          Settled on Base chain (no ETH needed)

14:23:09  evaluator.neuralmesh.eth scored the result: 94/100
          Updated researcher's reputation on ENS blockchain: 0.91 -> 0.94

14:23:11  Task complete. Answer returned to you.
          Researcher training buffer: 48/50 tasks
```

When the researcher hits 50 tasks, evolution.neuralmesh.eth triggers automatic AI fine-tuning on 0G's distributed GPUs. The researcher literally gets smarter.

---

## Setting Up More Features

The agents tell you what's missing at startup. Here's where to get each thing:

### 0G Compute — AI Inference

Agents need this to think.

1. Go to [compute-marketplace.0g.ai](https://compute-marketplace.0g.ai)
2. Connect your wallet
3. Copy your API key and service URL
4. Add to `.env`:

   ```env
   ZG_SERVICE_URL=https://...
   ZG_COMPUTE_API_KEY=your_key
   ```

5. Restart agents: `pnpm stop && pnpm start:agents`

### 0G Storage — Agent Memory

Agents need this to remember things across restarts.

```env
ZG_STORAGE_NODE_URL=https://...    # for file uploads
ZG_STORAGE_KV_NODE_URL=https://... # for key-value reads (DIFFERENT endpoint!)
```

Note: These are two different endpoints. Both are required for full memory.

### KeeperHub — Blockchain Execution and Payments

Agents need this to execute blockchain transactions and pay each other.

1. Go to [app.keeperhub.com](https://app.keeperhub.com)
2. Settings → API Keys → Create new key
3. Add to `.env`: `KEEPERHUB_API_KEY=your_key`

### Wallet + 0G Chain — On-chain Identity

Agents need this for iNFT identity and USDC earnings.

1. Create a new EVM wallet (MetaMask, Rabby, etc.)
2. Get testnet tokens at [faucet.0g.ai](https://faucet.0g.ai)
3. Add to `.env`:

   ```env
   PRIVATE_KEY=0x...
   ZG_RPC_URL=https://evmrpc-testnet.0g.ai
   ```

---

## Verify It's Actually Working

These are specific things you can check to confirm the system is running correctly.

### Check 1 — Agents are online
```bash
curl http://127.0.0.1:9002/api/self   # planner
curl http://127.0.0.1:9012/api/self   # researcher
curl http://127.0.0.1:9022/api/self   # executor
curl http://127.0.0.1:9032/api/self   # evaluator
curl http://127.0.0.1:9042/api/self   # evolution
```
Each should return a JSON object with a `pubkey` field.

### Check 2 — Agents can see each other
```bash
curl http://127.0.0.1:9002/api/peers
```
Should return a list including the other 4 agents.

### Check 3 — ENS resolution works
```bash
pnpm tsx -e "
  import { ENSResolver } from './packages/sdk/src/index.ts'
  const ens = new ENSResolver(process.env.SEPOLIA_RPC_URL)
  console.log(await ens.resolve('researcher.neuralmesh.eth'))
"
```

### Check 4 — iNFT contract is deployed
Visit the 0G Galileo explorer:
[chainscan-galileo.0g.ai/token/0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F](https://chainscan-galileo.0g.ai/token/0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F)

### Check 5 — Verify the evolution loop (end-to-end)
1. Open 0G Chain Scan → NeuralMesh iNFT contract → read `metadataHash(tokenId)` → copy the Merkle root hash
2. Open 0G Storage Scan → paste the hash → confirm the LoRA file exists
3. Open ENS App → `researcher.neuralmesh.eth` → confirm `neural-version` matches the version in the dashboard

---

## System Requirements

| Requirement | Version | Why |
|-------------|---------|-----|
| Node.js | >= 22 | Required by all TypeScript packages and 0G fine-tuning |
| Go | 1.25.x (NOT 1.26+) | gVisor build tag conflict in Go 1.26 breaks the AXL binary |
| pnpm | >= 9.15.4 | Workspace management |

Check all requirements at once:
```bash
pnpm check
```

> No openssl required — AXL keys are generated using Node.js built-in `crypto`. Works on Windows, Mac, and Linux without any extra tools.

---

## Project Structure

```
neuralmesh/
├── packages/
│   ├── contracts/          Solidity contracts (registry + ENS resolver)
│   ├── axl-go/             Go binary that runs the AXL P2P node
│   ├── sdk/                TypeScript SDK (NeuralMesh.create() factory)
│   └── agents/
│       ├── planner/        Orchestrator agent
│       ├── researcher/     DeFi research agent (the one that evolves)
│       ├── executor/       Blockchain execution agent
│       ├── evaluator/      Quality scoring agent
│       ├── evolution/      Fine-tuning management agent
│       └── shared/         Startup logic and types shared across agents
│   └── dashboard/          React web UI
├── workflows/              KeeperHub workflow definitions (5 files)
├── scripts/
│   ├── setup/              Dependency checks (00), key generation (01)
│   └── demo/               Start agents, stop agents, send demo task
├── docs/
│   └── FEEDBACK.md         KeeperHub integration feedback
└── spec/                   Architecture and design documents
```

---

## Deployed Contracts

| Contract | Network | Address | Explorer |
|----------|---------|---------|---------|
| NeuralMesh Registry | 0G Galileo (16602) | see `packages/contracts/deployments/galileo.json` | [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai) |
| NeuralMesh Resolver | Sepolia | see `packages/contracts/deployments/sepolia.json` | [sepolia.etherscan.io](https://sepolia.etherscan.io) |
| ERC-7857 iNFT | 0G Galileo | `0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F` | [link](https://chainscan-galileo.0g.ai/token/0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F) |

To deploy the NeuralMesh contracts yourself:
```bash
cd packages/contracts
pnpm hardhat run scripts/deploy-registry.ts --network galileo
pnpm hardhat run scripts/deploy-resolver.ts --network sepolia
```

---

## The Two New Ideas

**1. ENS as AXL's missing service registry**

The Gensyn AXL documentation says:
> "There is no built-in service registry. Keys and service names must be exchanged directly between people."

That's AXL's documented limitation. Every AXL demo requires manually exchanging 64-character hex public keys out-of-band.

NeuralMesh fixes this: ENS text records store each agent's AXL public key on-chain. Any agent can look up any other agent's connection details by resolving an ENS name. No manual exchange. Works at any scale.

**2. The self-funding evolution loop**

Agents earn USDC per task → use earnings to pay for fine-tuning on 0G GPUs → get smarter → attract more tasks → earn more → evolve again. The agent pays for its own improvement with its own work. No human in the loop.

---

## Reading the Agent Logs

Each agent writes to `logs/<name>.log`. Here's what the symbols mean:

```
[14:23:01] TASK RECEIVED    ← A task came in from another agent
[14:23:01] THINKING...      ← Running AI inference on 0G Compute
[14:23:04] RESULT READY     ← Inference complete, saving to 0G Storage
[14:23:04] DONE             ← Result sent back to requester

✓  This thing worked
✗  This thing failed (check the next line for why)
●  Online
○  Offline or unavailable
```

When you see `[warn]` lines like:
```
[researcher] 0G Storage write skipped: ZG_STORAGE_NODE_URL not set.
             Add to .env: ZG_STORAGE_NODE_URL=...
             Get it at: https://0g.ai/storage
```

That's not a crash — that's the capability system telling you what to add to unlock more features.

---

## AI Tools Attribution

This project was built using spec-driven development with Claude Code (claude-sonnet-4-6).

**What Claude helped with:**
- TypeScript SDK implementation (NeuralMesh.create(), agent factories, type system)
- React dashboard components
- Hardhat deployment scripts
- Cross-platform setup scripts (TypeScript, no bash required)

**What the human designed:**
- The core architecture: ENS as AXL service registry (novel primitive)
- The self-funding evolution loop design
- Which 5 partner technologies to use and how to integrate them
- The iNFT identity model
- All architectural decisions and integration choices
- Contract ABI selection and testing

**Runtime AI:** Agents use GLM-5-FP8 and Qwen2.5 via 0G Compute (not Claude) for inference.

---

## License

MIT
