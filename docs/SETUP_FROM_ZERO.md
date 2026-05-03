# NeuralMesh — Setup From Zero

Complete setup guide for first-time users. Windows PowerShell commands shown first, then Mac/Linux alternatives.

---

## What Are We Building?

NeuralMesh runs 5 AI agents on your machine. They:
- Find each other by ENS name on Ethereum (`*.neuralmesh.eth`)
- Talk directly over Gensyn's encrypted P2P network (AXL)
- Call a TokenRouter AI gateway to answer questions
- Pay each other $0.01 USDC per task via KeeperHub x402

**Minimum to see anything useful:** Node.js 22 + pnpm. That's Tier A.

---

## Tier A — Local Demo (No API Keys)

**Time:** ~5 minutes | **Cost:** Free | **What you get:** Dashboard loads, agents start in degraded mode

### Step 1 — Install Node.js 22

Download the **LTS** version (22.x or higher) from [nodejs.org](https://nodejs.org).

```powershell
# Verify
node --version    # v22.x.x or higher
```

### Step 2 — Install pnpm

```powershell
npm install -g pnpm
pnpm --version    # 9.x.x or higher
```

### Step 3 — Clone and install

```powershell
git clone https://github.com/shivam-kumar25/open-agents-ethglobal-submission.git
cd open-agents-ethglobal-submission
pnpm install
```

### Step 4 — Run the preflight check

```powershell
pnpm check
```

Expected output: Node.js, pnpm, tsx all green. AXL keys missing — you fix that next.

### Step 5 — Generate AXL identity keys

```powershell
pnpm keys
```

Creates one ed25519 keypair per agent in `packages/agents/shared/axl-keys/`. Uses Node.js built-in crypto — no openssl or WSL needed.

Expected:
```
  ✓  planner.pem    ─── generated
  ✓  researcher.pem ─── generated
  ✓  executor.pem   ─── generated
  ✓  evaluator.pem  ─── generated
  ✓  evolution.pem  ─── generated
```

### Step 6 — Build all packages

```powershell
pnpm build
```

Expected: `Tasks: 8 successful`. Takes ~30 seconds.

### Step 7 — Start agents

```powershell
pnpm start:agents
```

Expected:
```
  ✓  planner      PID: 12345   │ Port: :9002
  ✓  researcher   PID: 12346   │ Port: :9012
  ✓  executor     PID: 12347   │ Port: :9022
  ✓  evaluator    PID: 12348   │ Port: :9032
  ✓  evolution    PID: 12349   │ Port: :9042
```

### Step 8 — Open the dashboard

```powershell
pnpm dashboard
```

Open **http://localhost:3000**. Agents are running but in degraded mode — no AI inference without Tier B keys.

### Step 9 — Stop everything

```powershell
pnpm stop
```

---

## Tier B — Minimal Real Mode

**Time:** ~20 minutes | **Cost:** Free | **What you add:** Real ENS discovery + AI inference

Requires two free keys: **Alchemy** (Sepolia RPC) and **TokenRouter** (AI gateway).

### Getting the Alchemy key (Sepolia RPC)

1. Go to [dashboard.alchemy.com](https://dashboard.alchemy.com) and sign up (GitHub login works)
2. Click **Create new app** → Chain: Ethereum → Network: **Ethereum Sepolia**
3. Click **API Key** → copy the **HTTPS URL** (looks like `https://eth-sepolia.g.alchemy.com/v2/abc123...`)

Alternative (no signup, slower): `https://rpc.sepolia.org`

### Getting the TokenRouter API key (AI inference)

1. Go to [tokenrouter.com](https://tokenrouter.com)
2. Sign up and create an API key

### Setting up `.env`

```powershell
Copy-Item .env.example .env
```

Open `.env` and set:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TOKENROUTER_API_KEY=your_tokenrouter_key
```

Restart agents:
```powershell
pnpm stop
pnpm start:agents
```

**Verify ENS works:**
```powershell
curl http://127.0.0.1:9003/api/self   # planner AXL pubkey
```

Expected: `{"pubkey":"...","name":"planner",...}`

**Verify AI works:**
Submit a question in the dashboard. The researcher should return an actual AI-generated answer.

---

## Tier C — Full Mode

**Time:** ~60 minutes | **Cost:** Small USDC balance on Base for payments

**What you add:** ENS reputation writes + x402 micropayments + KeeperHub workflow automation

### Wallet Setup

You need an EVM wallet for signing ENS text record updates.

> Use a fresh wallet — never use your main wallet.

1. Install [MetaMask](https://metamask.io) or any EVM wallet
2. Create a new wallet
3. Account Details → Show Private Key → copy the 64-character hex string
4. Get free Sepolia ETH: [sepoliafaucet.com](https://sepoliafaucet.com)

In `.env`:
```env
PRIVATE_KEY=0x...your_private_key...
```

This enables:
- ENS text record writes (evaluator writes reputation scores to Ethereum)
- Evolution agent bumps `neural-version` on ENS
- ENS subname registration (if deploying your own resolver)

---

### KeeperHub — Workflow Automation and Payments

KeeperHub runs three workflows: health monitoring, evolution trigger, and payment settlement.

| Field | Value |
|-------|-------|
| Where to go | [app.keeperhub.com](https://app.keeperhub.com) |
| Difficulty | Medium |
| Time | 15 minutes |
| Cost | Free tier available |

**Setup steps:**

1. Sign up at [app.keeperhub.com](https://app.keeperhub.com)
2. Go to Settings → API Keys → Create new key

In `.env`:
```env
KEEPERHUB_API_KEY=your_keeperhub_api_key
```

**For x402 micropayments (agents paying each other):**

```powershell
npx -p @keeperhub/wallet keeperhub-wallet add
```

This creates a Turnkey agentic wallet. Copy the address:

```env
KEEPERHUB_WALLET_ADDRESS=0x...your_turnkey_wallet...
```

**Import workflows:**

The `workflows/` directory contains three KeeperHub workflow JSON files:
- `health-monitor.json` — pings all 5 agents every 5 minutes
- `evolution-trigger.json` — fires when researcher task count crosses threshold
- `payment-settlement.json` — routes USDC micropayments between agents

Import them in the KeeperHub UI. After import, copy the webhook URL for `evolution-trigger.json` — agents call it after each evaluated task.

---

## Building the AXL Binary (Required for P2P)

The AXL binary enables encrypted P2P communication between agents. Without it, agents run locally but the mesh is offline.

| Requires | Go 1.25.x **exactly** — NOT 1.26+ (gVisor build tag conflict) |

1. Download Go 1.25.x from [go.dev/dl](https://go.dev/dl)
2. Build:

```powershell
# Windows PowerShell
cd packages/axl-go
make build
cd ../..
pnpm stop
pnpm start:agents
```

```bash
# Mac / Linux
cd packages/axl-go && make build && cd ../..
pnpm stop && pnpm start:agents
```

Verify:
```powershell
curl http://127.0.0.1:9003/api/self   # should return {"pubkey":"..."}
```

---

## Deploying the ENS Resolver (Optional)

The `neuralmesh.eth` subnames are pre-registered. To deploy your own instance:

```bash
# 1. Deploy NeuralMeshResolver to Sepolia
pnpm --filter @neuralmesh/contracts run deploy:resolver

# 2. Copy the deployed address to .env
NEURALMESH_RESOLVER=0x...

# 3. Register all 5 agent subnames
pnpm --filter @neuralmesh/contracts run issue:subnames
```

You'll need each agent's AXL pubkey:
```bash
curl http://127.0.0.1:9003/api/self | jq .pubkey   # planner
curl http://127.0.0.1:9013/api/self | jq .pubkey   # researcher
# etc.
```

Set in `.env`:
```env
PLANNER_AXL_PUBKEY=...
RESEARCHER_AXL_PUBKEY=...
EXECUTOR_AXL_PUBKEY=...
EVALUATOR_AXL_PUBKEY=...
EVOLUTION_AXL_PUBKEY=...
```

---

## Troubleshooting

### "ECONNREFUSED" when running pnpm demo

Agents are not started. Run `pnpm start:agents` first.

### "tsx: command not found"

```powershell
pnpm install
```

### Dashboard shows agents as offline but they are running

Wait 5–10 seconds for agents to initialize. Check their logs:

```powershell
# Windows PowerShell
Get-Content logs/planner.log -Wait
```

```bash
# Mac / Linux
tail -f logs/planner.log
```

### Capability report shows "TOKENROUTER_API_KEY missing"

Add to `.env`:
```env
TOKENROUTER_API_KEY=your_key_from_tokenrouter_com
```

### ENS writes fail ("ENS update skipped")

Either `PRIVATE_KEY` is not set, or the ENS name is not yet registered. For the demo, ENS reads still work (reputation is shown from chain). ENS writes require `PRIVATE_KEY` and owning the ENS subname.

---

## What Each Variable Does

| Variable | Tier | What it enables |
|----------|------|-----------------|
| `SEPOLIA_RPC_URL` | B | ENS name resolution — agents find each other by `.eth` name |
| `TOKENROUTER_API_KEY` | B | AI inference — agents actually answer questions |
| `TOKENROUTER_MODEL` | B | Which model to use (default: `meta-llama/Llama-3.1-8B-Instruct`) |
| `PRIVATE_KEY` | C | ENS reputation writes, payment signing |
| `KEEPERHUB_API_KEY` | C | Workflow automation, x402 micropayment routing |
| `KEEPERHUB_WALLET_ADDRESS` | C | Turnkey wallet for x402 payments |
| `NEURALMESH_RESOLVER` | C | Address of deployed NeuralMeshResolver (only if running your own) |

All variables are documented in `.env.example`.

---

## Dashboard Variables (VITE_ prefix)

The dashboard is a Vite browser app. It can only read variables prefixed with `VITE_`.

In your root `.env`, also set:
```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_EVOLUTION_THRESHOLD=50
```

These mirror the same values from the non-VITE_ env vars.
