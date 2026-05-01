# KeeperHub Integration Feedback — NeuralMesh

## Summary

NeuralMesh is a self-evolving decentralized AI agent economy. We used KeeperHub for all 5 core workflows (agent health monitoring, DeFi yield alerts, onchain execution, evolution trigger, payment settlement) plus the Turnkey agentic wallet for x402 micropayments between agents.

This document covers specific, actionable feedback from building NeuralMesh on KeeperHub.

---

## UX/UI Friction

### 1. Para wallet vs Turnkey agentic wallet distinction is not clear in docs

**What I expected:** A single "wallet" abstraction for agent payments.

**What happened:** KeeperHub has two wallet systems — the Para MPC wallet (KeeperHub's internal custody) and the Turnkey agentic wallet (`@keeperhub/wallet`). The Para wallet is used for KeeperHub's own transaction signing. The Turnkey wallet is what agent code uses for x402 micropayments. These are completely different systems with different APIs, but the documentation uses "wallet" for both without clearly distinguishing them.

**Steps to reproduce:** Read the "Payments" section of KeeperHub docs. The word "wallet" appears 12 times referring to both systems.

**Suggested fix:** Add a "Two wallet systems" callout box at the top of the Payments section. Something like: "KeeperHub uses two wallet systems: (1) Para wallet for internal transaction signing — you don't interact with this directly; (2) Turnkey agentic wallet via `@keeperhub/wallet` — this is what your agent code uses for x402 payments."

---

### 2. Workflow template variable syntax `{{@nodeId:Label.field}}` needs more examples

**What I expected:** Template variables would work like standard template strings.

**What happened:** The syntax `{{@nodeId:Label.field}}` is non-obvious. The `@` prefix, the colon-separated nodeId/Label, and the dot-notation field access are all non-standard. Without examples for every node type (HttpRequest, Code, EVMTransaction), it's unclear what `Label` refers to (it's the node type, not a custom label).

**Steps to reproduce:** Try to reference the output of an HttpRequest node in a Code node. The docs show one example but not the pattern for different node types.

**Suggested fix:** Add a "Template Variable Reference" section with the full table:
```
{{@nodeId:HttpRequest.body}}       — response body (parsed JSON)
{{@nodeId:HttpRequest.status}}     — HTTP status code
{{@nodeId:HttpRequest.success}}    — boolean
{{@nodeId:Code.output}}            — return value of code node
{{@nodeId:EVMTransaction.txHash}}  — transaction hash
{{@nodeId:EVMTransaction.success}} — boolean
{{@trigger:Trigger.fieldName}}     — input field from trigger
```

---

## Documentation Gaps

### 1. No documentation on workflow import/export format

**Where I got stuck:** We have 5 KeeperHub workflows committed to our repo as JSON files. There is no documented format for these files, no CLI to import them, and no API endpoint documented for programmatic workflow creation.

**What was missing:** A "Workflow JSON Schema" page or a `keeperhub export <workflowId>` CLI command.

**What would have helped:** Either (1) a `keeperhub import workflow.json` CLI command or (2) the REST API endpoint for `POST /workflows` with the JSON schema documented.

---

### 2. x402 protocol implementation details not linked

**Where I got stuck:** We wanted to implement x402 payment verification on the receiving side (to verify that payment was actually received before delivering service).

**What was missing:** The x402 protocol spec is not linked from KeeperHub docs. We found it via the x402.org spec, but KeeperHub should link directly to the relevant payment verification patterns.

**What would have helped:** A "Verifying x402 Payments" section showing how to decode and verify a payment receipt on the receiving agent.

---

## Reproducible Bugs

### 1. Webhook trigger fires twice on first deployment

**Steps:**
1. Create a new workflow with Webhook trigger
2. Send a POST request to the webhook URL
3. Check execution history

**Expected:** One execution per POST.

**Actual:** First request after deploying triggers two executions. Subsequent requests trigger one. Issue resolves after ~5 minutes.

**Environment:** KeeperHub web UI, Chrome 131, workflows created May 1, 2026.

---

## Feature Requests

### 1. Multi-agent workflow type

**Use case:** NeuralMesh needs to orchestrate across 5 agents. Currently each workflow is single-agent. We want to define a "multi-agent" workflow that can fork to 5 parallel HttpRequest nodes (one per agent), collect all responses (Convergecast pattern), and aggregate.

**Current workaround:** We use a Code node that calls fetch() to each agent's AXL API sequentially. This is slower and loses the parallel execution benefit.

**Why this matters:** Any multi-agent AI system (NeuralMesh, AutoGPT-like, agent swarms) needs this pattern. It's currently impossible to express efficiently in a single KeeperHub workflow.

---

### 2. Workflow versioning and rollback

**Use case:** When we update a workflow, we want to keep the previous version so we can roll back if something breaks.

**Current workaround:** Manually copy workflow JSON before editing.

**Why this matters:** In production, a workflow update that breaks an agent's payment settlement is catastrophic. Rollback should be one click.

---

### 3. Agent-to-agent workflow invocation (A2A workflow calls)

**Use case:** The evolution agent needs to call the `neuralmesh-evolution-trigger` workflow on behalf of the researcher agent. Currently workflows can only be triggered by external webhooks or schedules — not by other agents calling them.

**Current workaround:** Agent makes a direct POST to the KeeperHub REST API. This works but bypasses the marketplace discovery mechanism.

**Why this matters:** The KeeperHub vision is a marketplace where agents hire other agents' workflows. That requires agent-triggered workflow execution.
