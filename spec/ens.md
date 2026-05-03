# ENS Integration Spec

## Overview

NeuralMesh uses ENS (Ethereum Name Service) on Sepolia for three things:
1. **Agent identity** — each agent has a `*.neuralmesh.eth` subname
2. **Peer discovery** — agents resolve ENS names to get AXL public keys
3. **On-chain reputation** — evaluator writes quality scores to ENS text records after each task

---

## Subname Schema

Each agent has a subname under `neuralmesh.eth`:

```
planner.neuralmesh.eth
researcher.neuralmesh.eth
executor.neuralmesh.eth
evaluator.neuralmesh.eth
evolution.neuralmesh.eth
```

### Text Records

| Key | Type | Updated by | Example |
|-----|------|-----------|---------|
| `axl-pubkey` | hex string | Set at registration, updated on key rotation | `1ee862344fb2833c...` |
| `neural-version` | semver string | Evolution agent | `v1.3.0` |
| `neural-reputation` | float string | Evaluator agent (per task) | `0.94` |
| `neural-tasks` | integer string | Evaluator agent (per task) | `142` |
| `neural-model` | string | Set at registration | `meta-llama/Llama-3.1-8B-Instruct` |
| `url` | URL | Set at registration | `https://neuralmesh.xyz/agent/researcher` |

---

## NeuralMeshResolver Contract

File: `packages/contracts/src/NeuralMeshResolver.sol`
Network: Sepolia (chainId 11155111)
Deployment: `packages/contracts/deployments/sepolia.json`

### Key Functions

```solidity
function issueSubname(
    string calldata label,      // "researcher"
    address subOwner,           // agent wallet address
    uint256 tokenId,            // sequential ID (1-5)
    bytes calldata axlPubkey    // AXL ed25519 pubkey bytes
) external;
```

Called once per agent after deploying. Sets:
- ENS Registry: `setSubnodeOwner(parentNode, keccak256(label), subOwner)`
- ENS Registry: `setResolver(subNode, address(this))`
- Text record: `axl-pubkey` = hex(axlPubkey)
- Text record: `token-id` = string(tokenId)
- Text record: `url` = `https://neuralmesh.xyz/agent/{label}`
- Addr record: subOwner

```solidity
function setText(bytes32 node, string calldata key, string calldata value) external;
function text(bytes32 node, string calldata key) external view returns (string memory);
function addr(bytes32 node) external view returns (address);
```

Authorization: caller must be ENS owner of the node, contract owner, or authorized NeuralMesh agent.

### One-Time Setup

After deploying the resolver:
```bash
# 1. Set the parent node (neuralmesh.eth namehash)
npx hardhat run scripts/deploy-resolver.ts --network sepolia
# NEURALMESH_ENS_NODE env var triggers setParentNode automatically

# 2. Register all 5 agent subnames
npx hardhat run scripts/issue-subnames.ts --network sepolia
```

---

## ENSResolver SDK Class

File: `packages/sdk/src/discovery/ENSResolver.ts`

### Methods

```typescript
resolve(ensName: string): Promise<{
  address: string
  axlPubkey: string
  version: string
  reputation: number
  tasks: number
}>

getText(ensName: string, key: string): Promise<string | null>
setText(ensName: string, key: string, value: string, signerKey: string): Promise<void>
getAddress(ensName: string): Promise<string | null>
```

### How Agents Use It

**Peer discovery (every `agent.find()` call):**
```
agent.find('researcher.neuralmesh.eth')
  → ENSResolver.resolve('researcher.neuralmesh.eth')
  → reads axl-pubkey text record
  → returns AgentHandle with pubkey for AXL connection
```

**Reputation update (every evaluator task completion):**
```
evaluator completes scoring
  → ENSResolver.setText('researcher.neuralmesh.eth', 'neural-reputation', '0.94', signerKey)
  → ENSResolver.setText('researcher.neuralmesh.eth', 'neural-tasks', '143', signerKey)
```

**Version bump (every evolution cycle):**
```
evolution agent triggered
  → read current 'neural-version' → e.g. 'v1.2.0'
  → bump patch → 'v1.2.1'
  → ENSResolver.setText('researcher.neuralmesh.eth', 'neural-version', 'v1.2.1', signerKey)
  → GossipSub.publish('evolution-complete', { from: 'v1.2.0', to: 'v1.2.1' })
```

---

## Failure Handling

| Failure | Behavior |
|---------|---------|
| SEPOLIA_RPC_URL not set | ENS discovery skipped; agents start with capability warning. Agents still connect via hardcoded pubkeys if set. |
| ENS setText fails (no PRIVATE_KEY) | Warning logged; agent continues. Reputation not persisted to chain. |
| ENS name not registered | `resolve()` returns null fields. Agent logs warning: "Register {name} at sepolia.app.ens.domains". |
| Sepolia RPC rate limit | Retry with exponential backoff (3 attempts). Falls back to last known value. |

---

## Dashboard Integration

The dashboard reads ENS records via `packages/dashboard/src/hooks/useENSRecords.ts`:
- Polls all 5 agents' ENS records every 30 seconds via `viem` public client on Sepolia
- Displays: version, reputation score, task count, AXL pubkey (truncated)
- Links: "View on ENS" → `https://app.ens.domains/{agentName}`

---

## What This Demonstrates for ENS Judges

1. **Custom resolver deployment** — `NeuralMeshResolver.sol` extends ENS with domain-specific logic (subname issuance tied to agent registration)
2. **Programmatic subname issuance** — `issueSubname()` creates `*.neuralmesh.eth` subnames atomically on-chain
3. **Text records as live agent metadata** — reputation, version, and AXL connection key are readable by anyone from the Ethereum chain
4. **ENS as P2P service registry** — solving AXL's documented limitation (no built-in service registry) using ENS as the discovery layer
