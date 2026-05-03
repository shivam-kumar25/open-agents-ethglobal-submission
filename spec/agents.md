# NeuralMesh — Agent Specifications

> Per-agent deep spec: state schema, inputs/outputs, evolution thresholds, AXL patterns used.

---

## Common Agent Structure

Every agent is:
1. A **running process** (Node.js) with its own AXL binary subprocess
2. An **iNFT** on 0G Chain (minted on first startup, loaded thereafter)
3. An **ENS subname** under `neuralmesh.eth` (registered on first startup)
4. A **0G Storage stream** (KV for state + file log for history)
5. A **KeeperHub agentic wallet** (for paying and receiving x402)

**Common state in 0G Storage KV (all agents):**
```
{ens_name}/status          → "idle" | "working" | "evolving"
{ens_name}/current_task    → task_id or null
{ens_name}/earnings_total  → "142.50" (USDC string)
{ens_name}/task_count      → integer (lifetime tasks completed)
{ens_name}/last_heartbeat  → ISO timestamp
{ens_name}/axl_pubkey      → hex string (redundant with ENS, cached locally)
```

**Common ENS text records (all agents):**
```
axl-pubkey          → ed25519 public key hex
axl-services        → comma-separated service names
neural-version      → "v1" (incremented by evolution agent)
neural-capabilities → JSON string
neural-reputation   → float string "0.00"–"1.00"
neural-earnings     → USDC total string
description         → human-readable one-liner
url                 → A2A agent card endpoint
```

---

## Agent 1: `planner.neuralmesh.eth`

### Role
Master orchestrator. Receives user goals, decomposes into subtasks, discovers and hires specialists, pays them, aggregates results, evaluates quality.

### Configuration
```
AXL port:      9002
MCP router:    9003
A2A server:    9004
Model:         GLM-5-FP8 (sealed TEE inference — planner decisions are auditable)
iNFT policy:   "You are a master orchestrator. Decompose goals into specific, assignable subtasks."
Evolve:        false (planner uses fixed policy; evolution is for specialists)
```

### AXL Patterns Used
- **MCP (server):** exposes `decompose_task`, `evaluate_result`
- **MCP (client):** calls researcher, executor, evaluator services
- **A2A (client):** discovers specialists by capability, hires dynamically
- **GossipSub (subscriber):** receives market alerts, evolution notifications
- **Send/Recv:** heartbeat pings to all specialists every 30s

### MCP Services Exposed
```typescript
// decompose_task
Input:  { goal: string, context?: string }
Output: { subtasks: Array<{ id: string, description: string, required_capability: string }> }

// evaluate_result
Input:  { task_id: string, result: unknown, criteria?: string[] }
Output: { accepted: boolean, score: number, feedback: string }
```

### 0G Storage Schema
```
planner.neuralmesh.eth/tasks/{task_id}         → JSON task graph
planner.neuralmesh.eth/tasks/{task_id}/status  → "decomposed" | "delegated" | "complete"
planner.neuralmesh.eth/payment_log             → JSONL file (all x402 payments made)
```

### Onchain Actions
- Calls `neuralmesh-payment-settle` KeeperHub workflow to pay specialists
- Calls `neuralmesh-agent-health` to check specialist health before hiring
- Reads NeuralMeshRegistry on 0G Chain to verify specialist iNFT is active

### Evolution
None. The planner's policy is encoded in its iNFT system prompt hash. Its value comes from coordination, not inference quality.

---

## Agent 2: `researcher.neuralmesh.eth`

### Role
Knowledge specialist. DeFi data retrieval, protocol analysis, synthesis, fact-checking. Gets smarter with every task.

### Configuration
```
AXL port:      9012
MCP router:    9013
A2A server:    9014
Model:         qwen/qwen-2.5-7b-instruct (standard inference)
               → post-evolution: loads LoRA adapter on top of base model
iNFT policy:   "You are a DeFi research specialist. Be precise, cite sources, flag uncertainty."
Evolve:        true
Evolution threshold: 10 training examples (in 0G Storage KV)
Fine-tune model:     Qwen2.5-0.5B-Instruct (fast iteration)
```

### AXL Patterns Used
- **MCP (server):** exposes `research`, `summarize`, `fact_check`
- **GossipSub (subscriber):** receives `yield-alert` topics from DeFi monitor
- **Send/Recv (receiver):** receives status pings from planner

### MCP Services Exposed
```typescript
// research
Input:  { query: string, depth?: "quick" | "deep" }
Output: { findings: string, sources: string[], confidence: number, merkle_root: string }
// merkle_root = 0G Storage file address of full findings

// summarize
Input:  { text: string, max_words?: number }
Output: { summary: string }

// fact_check
Input:  { claim: string, context?: string }
Output: { verdict: "true" | "false" | "uncertain", explanation: string, confidence: number }
```

### 0G Storage Schema
```
researcher.neuralmesh.eth/training_count      → integer (KV — evolution trigger)
researcher.neuralmesh.eth/lora_merkle         → latest LoRA adapter Merkle root (KV)
researcher.neuralmesh.eth/findings/{task_id}  → JSONL file (full research output)
researcher.neuralmesh.eth/training_data.jsonl → JSONL file (accumulates all interactions)
  Format per line:
  {"messages": [
    {"role": "user", "content": "research query: {query}"},
    {"role": "assistant", "content": "{findings}"}
  ]}
```

### JSONL Training Example (what gets saved per task)
```json
{
  "messages": [
    {"role": "system", "content": "You are a DeFi research specialist..."},
    {"role": "user", "content": "research query: What is current Aave ETH yield?"},
    {"role": "assistant", "content": "Current Aave V3 ETH supply APY: 4.2%. Source: aave.com/markets..."}
  ]
}
```

### Evolution Trigger (handled by evolution agent)
```
training_count >= 10
  → KeeperHub: neuralmesh-evolution-trigger workflow
  → 0G fine-tuning: Qwen2.5-0.5B on training_data.jsonl
  → LoRA adapter stored in 0G Storage
  → iNFT metadata hash updated on 0G Chain
  → ENS neural-version bumped: v1 → v2
  → ENS neural-capabilities updated: {"domain": "DeFi", "training_examples": 10, "accuracy": improved}
  → GossipSub broadcast: researcher v2 live
  → training_count reset to 0
```

### Revenue Model
- Charges $0.01 USDC per research query (collected by planner via x402)
- Earnings stored in ENS `neural-earnings` text record
- Revenue = direct trigger for continued fine-tuning (more calls = more money = more training)

---

## Agent 3: `executor.neuralmesh.eth`

### Role
Onchain action specialist. Translates agent decisions into reliable blockchain transactions. Full audit trail for every action.

### Configuration
```
AXL port:      9022
MCP router:    9023
A2A server:    9024
Model:         qwen/qwen-2.5-7b-instruct (for simulation and audit narration)
iNFT policy:   "You execute blockchain actions. Simulate before executing. Log everything. Never act without authorization."
Evolve:        false (execution policy must be deterministic, not learned)
```

### AXL Patterns Used
- **MCP (server):** exposes `execute_onchain`, `simulate`, `get_audit_trail`
- **A2A (server):** full A2A agent card for external agents to hire
- **GossipSub (publisher):** broadcasts execution completions + failures to mesh
- **Send/Recv:** streams execution progress updates to caller

### MCP Services Exposed
```typescript
// simulate
Input:  { contract: string, method: string, args: unknown[], network: string }
Output: { success: boolean, gas_estimate: number, revert_reason?: string }

// execute_onchain
Input:  {
  contract: string, method: string, args: unknown[], network: string,
  authorization_token: string  // iNFT authorizeUsage() token from caller's iNFT
}
Output: { tx_hash: string, status: "success" | "failed", audit_trail_merkle: string }

// get_audit_trail
Input:  { task_id: string }
Output: { log: AuditEntry[], merkle_root: string }
// merkle_root = 0G Storage address of full audit log
```

### 0G Storage Schema
```
executor.neuralmesh.eth/audits/{task_id}.jsonl  → full execution log
executor.neuralmesh.eth/pending_actions          → KV: current queue
```

### Audit Trail Format (stored in 0G Storage File)
```json
{"timestamp": "2026-04-30T...", "action": "simulate", "contract": "0x...", "method": "deposit", "result": "success", "gas_estimate": 45000}
{"timestamp": "2026-04-30T...", "action": "execute", "tx_hash": "0x...", "status": "confirmed", "block": 12345}
{"timestamp": "2026-04-30T...", "action": "verify", "da_proof": "0x...", "verified": true}
```

### Precompile Usage
- `DASigners` at `0x1000` — verifies data availability of execution proofs on 0G Chain
- `Wrapped0GBase` at `0x1002` — wraps 0G for DeFi operations (e.g. providing liquidity)

### KeeperHub Integration (primary — all execution routes through KeeperHub)
```
All execute_onchain calls → call_workflow('neuralmesh-onchain-executor')
  → KeeperHub: Write Contract node (MEV protection, 3-retry with backoff)
  → KeeperHub: logs execution result
  → Executor: receives result via webhook → stores in 0G Storage audit trail
```

---

## Agent 4: `evaluator.neuralmesh.eth`

### Role
Quality arbiter. Scores task completions, updates agent reputations on-chain (ENS text records), feeds evaluation as training signal back into researchers.

### Configuration
```
AXL port:      9032
MCP router:    9033
A2A server:    9034
Model:         qwen/qwen-2.5-7b-instruct
iNFT policy:   "You evaluate task quality. Be objective. Score 0.0–1.0. Explain your reasoning."
Evolve:        false (evaluator must be stable; its signal is the ground truth for other agents)
```

### AXL Patterns Used
- **MCP (server):** exposes `score_task`, `update_reputation`
- **Convergecast:** multiple evaluator instances aggregate scores toward planner
  ```
  evaluator-A:9032 ──┐
  evaluator-B:9132 ──┼──► aggregate → planner:9002
  evaluator-C:9232 ──┘
  ```
- **Send/Recv:** receives task completion notifications

### MCP Services Exposed
```typescript
// score_task
Input:  { task_id: string, goal: string, result: unknown, agent_ens: string }
Output: { score: number, feedback: string, training_example: TrainingExample }
// score: 0.0–1.0
// training_example: formatted JSONL to add to agent's training buffer

// update_reputation
Input:  { agent_ens: string, new_score: number, evidence: string }
Output: { tx_hash: string, old_score: string, new_score: string }
// → writes ENS text record: neural-reputation
```

### Convergecast Implementation
```typescript
// Planner calls all evaluator instances simultaneously
const scores = await Promise.all([
  evaluatorA.call('score_task', params),
  evaluatorB.call('score_task', params),
  evaluatorC.call('score_task', params),
])
// AXL Convergecast aggregation: weighted average (by evaluator reputation)
const final_score = convergecast_aggregate(scores)
```

### ENS Write Pattern
The evaluator is the only agent that **writes to other agents' ENS text records**.
```typescript
// After scoring, evaluator updates the scored agent's reputation on-chain
await ensResolver.setTextRecord(
  researcher_node,        // researcher.neuralmesh.eth namehash
  'neural-reputation',    // key
  score.toFixed(2)        // value: "0.91"
)
// This is authenticated: evaluator's wallet must be authorized by NeuralMeshRegistry
```

### 0G Storage Schema
```
evaluator.neuralmesh.eth/scores/{task_id}.json  → evaluation result
evaluator.neuralmesh.eth/reputation_history.jsonl → full reputation update log
```

---

## Agent 5: `evolution.neuralmesh.eth`

### Role
Meta-agent. Watches all agents, manages the evolution pipeline, announces upgrades. The agent that closes the loop.

### Configuration
```
AXL port:      9042
MCP router:    9043
A2A server:    9044
Model:         qwen/qwen-2.5-7b-instruct (minimal — mostly orchestration, not inference)
iNFT policy:   "You manage agent evolution. Monitor training data accumulation. Trigger fine-tuning. Maintain the mesh."
Evolve:        false (evolution agent must be stable)
Poll interval: 60 seconds
```

### AXL Patterns Used
- **GossipSub (publisher):** broadcasts evolution events to entire mesh
- **Convergecast (root):** aggregates health state from all agents
- **MCP (server):** exposes `get_training_status`, `trigger_evolution`
- **Send/Recv:** sends topology-check pings to all agents

### MCP Services Exposed
```typescript
// get_training_status
Input:  { agent_ens: string }
Output: { training_count: number, threshold: number, last_finetune: string, next_version: string }

// trigger_evolution (manual override by human or planner)
Input:  { agent_ens: string, force?: boolean }
Output: { job_id: string, status: "queued" | "running" | "complete" | "failed" }
```

### Mesh Health Aggregation (Convergecast)
```
Every 5 minutes:
  evolution → AXL Convergecast → all agents
  Aggregates:
    - training_count per agent (from 0G Storage KV)
    - last_heartbeat per agent (from 0G Storage KV)
    - current_task per agent
    - liveness (AXL topology check)
  
  Stores aggregate in:
    evolution.neuralmesh.eth/mesh_health.json (0G Storage KV)
  
  Broadcasts via GossipSub if agent appears degraded:
    {"topic": "agent-health-alert", "agent": "...", "issue": "stale heartbeat"}
```

### Evolution Pipeline (detailed)
```typescript
async function runEvolutionCheck(agentEns: string) {
  // 1. Read training count from 0G Storage
  const count = await kvStore.read(`${agentEns}/training_count`)
  if (count < THRESHOLD) return

  // 2. Read training dataset from 0G Storage
  const dataset = await logStore.download(`${agentEns}/training_data.jsonl`)

  // 3. Verify dataset availability via DASigners precompile
  const daProof = await daSigners.verifyAvailability(dataset.merkleRoot)
  if (!daProof.available) throw new Error('Dataset not available on DA layer')

  // 4. Trigger fine-tuning via KeeperHub workflow
  const { job_id } = await keeperhub.callWorkflow('neuralmesh-evolution-trigger', {
    dataset_merkle: dataset.merkleRoot,
    model: 'Qwen2.5-0.5B-Instruct',
    agent_ens: agentEns,
  })

  // 5. Poll until complete (KeeperHub workflow handles this)
  // Full status lifecycle:
  // Init → SettingUp → SetUp → Training → Trained → Delivering → Delivered
  // → [acknowledge-model within 48h!] → UserAcknowledged → [wait ~1 min] → Finished
  // Any state can transition to Failed
  // CRITICAL: Delivered → acknowledge window = 48h. Miss it = 30% penalty + model lost.

  // 6. Download and store LoRA adapter
  const lora = await fineTuner.downloadModel(job_id)
  const { merkleRoot } = await logStore.upload(lora, `${agentEns}/lora_v${nextVersion}.bin`)

  // 7. Update iNFT on 0G Chain
  await iNFT.updateMetadataHash(tokenId, merkleRoot)

  // 8. Update ENS text records
  await ensResolver.setTextRecord(agentNode, 'neural-version', `v${nextVersion}`)
  await ensResolver.setTextRecord(agentNode, 'neural-capabilities', JSON.stringify(updatedCaps))

  // 9. Broadcast via AXL GossipSub
  await axl.broadcast('evolution', {
    agent: agentEns,
    version: `v${nextVersion}`,
    merkle_root: merkleRoot,
    capabilities: updatedCaps,
  })

  // 10. Reset training counter
  await kvStore.write(`${agentEns}/training_count`, 0)
}
```

### 0G Storage Schema
```
evolution.neuralmesh.eth/mesh_health.json       → current aggregate health (KV)
evolution.neuralmesh.eth/evolution_log.jsonl    → full evolution history (file)
  Per line: { agent, old_version, new_version, job_id, merkle_root, timestamp }
```

---

## Agent Interaction Matrix

| Caller → | planner | researcher | executor | evaluator | evolution |
|----------|---------|-----------|---------|----------|----------|
| **planner** | — | MCP: research() | A2A: execute_onchain() | MCP: score_task() | MCP: get_training_status() |
| **researcher** | — | — | — | — | — |
| **executor** | GossipSub: exec_complete | — | — | — | — |
| **evaluator** | Convergecast: aggregate score | ENS write: reputation | — | — | — |
| **evolution** | GossipSub: version_update | GossipSub: version_update | — | — | — |

---

## iNFT Token Design

Each agent's iNFT maps to two on-chain fields plus off-chain encrypted content:

```
On-chain (0G Galileo — public, queryable):
  tokenId:       uint256 (auto-assigned at mint)
  owner:         address (agent wallet)
  metadataHash:  bytes32 (Merkle root of LoRA adapter zip in 0G Storage)
  encryptedURI:  string  (URI to TEE-encrypted bundle — only owner can decrypt)

Off-chain encrypted bundle (at encryptedURI, decryptable by owner only):
  system_prompt: string   — the agent's core instructions
  lora_pointer:  string   — 0G Storage Merkle root of LoRA adapter file
  capability_vector: float[] — embedding of agent specialization

Metadata JSON (public, returned by tokenURI — non-sensitive fields only):
```json
{
  "name": "NeuralMesh Researcher v1",
  "description": "Self-evolving DeFi research agent",
  "attributes": [
    {"trait_type": "Role", "value": "researcher"},
    {"trait_type": "BaseModel", "value": "Qwen2.5-0.5B-Instruct"},
    {"trait_type": "Version", "value": 1},
    {"trait_type": "TrainingExamples", "value": 10},
    {"trait_type": "Specialization", "value": "DeFi"},
    {"trait_type": "LoRAMerkleRoot", "value": "0xabc..."},
    {"trait_type": "RoyaltyBps", "value": 500}
  ]
}
```

**On transfer (`iTransferFrom`):**
1. Caller provides `sealedKey` — the LoRA decryption key re-encrypted for buyer's public key (TEE operation)
2. Caller provides `proof` — ZKP or TEE attestation that re-encryption was done correctly
3. Contract: clears all `authorizeUsage` grants on the token
4. Contract: updates `owner` to buyer
5. Buyer decrypts `encryptedURI` content with their private key → gets system prompt + LoRA pointer
6. Buyer downloads LoRA adapter from 0G Storage using the pointer
7. Original creator earns 5% royalty (500 bps) on the sale price — enforced by contract

**Evolution update pattern (after fine-tuning):**
- The evolution agent mints a new iNFT with the updated `metadataHash` (new LoRA Merkle root)
- Old iNFT is retired (or the contract supports a metadata update function if available)
- Safe pattern: new token minted → new ENS text records point to new token ID → old token burned
