# KeeperHub Integration Spec

## Overview

NeuralMesh uses KeeperHub for:
1. **Workflow automation** — three declarative workflows manage agent health, evolution triggers, and payment settlement
2. **x402 micropayments** — agents pay each other $0.01 USDC per task via the AgenticWallet

---

## Workflows

All workflow definitions are in `workflows/`. These are JSON files that can be imported into KeeperHub.

### 1. health-monitor.json

**Purpose:** Ping all 5 agents every 5 minutes and alert if any are down.

**Trigger:** Schedule (every 5 minutes)

**Steps:**
1. HttpRequest to `http://127.0.0.1:9003/api/self` (planner)
2. HttpRequest to `http://127.0.0.1:9013/api/self` (researcher)
3. HttpRequest to `http://127.0.0.1:9023/api/self` (executor)
4. HttpRequest to `http://127.0.0.1:9033/api/self` (evaluator)
5. HttpRequest to `http://127.0.0.1:9043/api/self` (evolution)
6. Code node: check all responses, count offline agents
7. If any offline: alert (log or webhook)

**KeeperHub value:** Replaces a polling cron job with a declarative, observable workflow. Execution history is visible in the KeeperHub dashboard.

---

### 2. evolution-trigger.json

**Purpose:** When the researcher's task count crosses the evolution threshold, trigger the evolution agent to bump the ENS version.

**Trigger:** Webhook (called by evaluator after writing task count to ENS)

**Steps:**
1. HttpRequest to `http://127.0.0.1:9032/api/self` (verify evaluator is alive)
2. Code node: extract `neural-tasks` count from webhook payload
3. Conditional: if `neural-tasks >= EVOLUTION_THRESHOLD`
4. HttpRequest to `http://127.0.0.1:9042/api/trigger-evolution` (evolution agent)
5. Code node: log result

**How the evaluator triggers it:**
```typescript
// In evaluator.ts after writing ENS records:
await keeperhub.triggerEvolution(agentName, taskCount)
// → POST to KeeperHub webhook URL for evolution-trigger workflow
```

**KeeperHub value:** The evaluator doesn't need to know about the evolution agent. It fires a webhook; KeeperHub handles the conditional routing and execution.

---

### 3. payment-settlement.json

**Purpose:** Route x402 USDC micropayments between agents after task completion.

**Trigger:** Webhook (called by planner after receiving researcher result)

**Steps:**
1. Code node: parse payment request (from, to, amount, taskId)
2. EVMTransaction: transfer USDC from planner wallet to researcher wallet (Base chain)
3. Code node: log payment with txHash

**KeeperHub value:** MEV protection and transaction retry logic are handled by KeeperHub. The planner doesn't need to manage gas, nonces, or retry loops.

---

## KeeperHub SDK Usage

File: `packages/sdk/src/execution/KeeperHub.ts`

```typescript
class KeeperHub {
  async triggerEvolution(agentName: string, taskCount: number): Promise<void>
  async triggerPayment(from: string, to: string, amountUsdc: string, taskId: string): Promise<void>
  async registerHealthMonitor(agentUrls: string[]): Promise<void>
}
```

---

## x402 Micropayments

File: `packages/sdk/src/execution/AgenticWallet.ts`

```typescript
class AgenticWallet {
  async pay(toAddress: string, amountUsdc: string, memo: string): Promise<void>
}
```

**Payment flow:**
```
Planner receives researcher result
  → planner.payAgent('researcher.neuralmesh.eth', '0.01')
    → ENSResolver.getAddress('researcher.neuralmesh.eth') → wallet address
    → AgenticWallet.pay(researcherAddress, '0.01', 'task payment')
      → KeeperHub x402 payment settlement workflow
        → USDC transfer on Base chain
```

**What is x402?**
x402 is a payment protocol where HTTP responses include a payment requirement header, and clients send payment proofs to unlock content. NeuralMesh uses KeeperHub's implementation where agents declare payment amounts and KeeperHub's Turnkey agentic wallet handles the settlement.

**Setup:**
```env
KEEPERHUB_API_KEY=your_key          # API authentication
KEEPERHUB_WALLET_ADDRESS=0x...      # Turnkey agentic wallet address
```

The Turnkey wallet is separate from your main EVM private key. Create it:
```bash
npx -p @keeperhub/wallet keeperhub-wallet add
```

---

## Environment Variables

```env
KEEPERHUB_API_KEY=              # required for any KeeperHub functionality
KEEPERHUB_WALLET_ADDRESS=       # required for x402 payments
```

---

## Failure Handling

| Failure | Behavior |
|---------|---------|
| `KEEPERHUB_API_KEY` not set | KeeperHub calls skipped with warning. Agents still run — payments are logged but not settled on-chain. |
| Workflow webhook call fails | Agent logs warning, continues. Task result still returned to user. |
| x402 payment fails | Task result returned anyway. Payment failure logged but not fatal. |

---

## What This Demonstrates for KeeperHub Judges

1. **Three real workflows** — health monitoring, evolution trigger, payment settlement — each addressing a different automation need
2. **x402 micropayments** — agents earn USDC per task via KeeperHub's agentic wallet
3. **Event-driven architecture** — evaluator fires webhook, KeeperHub decides whether to trigger evolution based on task count threshold
4. **Agent-to-agent payment routing** — the planner pays the researcher without needing to manage the transaction directly
5. **Feedback filed** — `docs/FEEDBACK.md` contains specific, actionable feedback on KeeperHub's UX, documentation gaps, and bugs found during integration
