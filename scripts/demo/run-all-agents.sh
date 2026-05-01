#!/usr/bin/env bash
set -euo pipefail

# Start all 5 NeuralMesh agents in separate background processes
# Each agent has its own AXL node on a separate port

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "NeuralMesh — Starting all 5 agents"
echo "==================================="

# Load .env
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

mkdir -p "$ROOT/logs"

start_agent() {
  local name=$1
  local cmd=$2
  echo "Starting $name..."
  cd "$ROOT"
  eval "$cmd" > "$ROOT/logs/$name.log" 2>&1 &
  echo $! > "$ROOT/logs/$name.pid"
  echo "  PID: $! | Log: logs/$name.log"
}

# Build first
cd "$ROOT"
echo "Building all packages..."
pnpm build 2>/dev/null || echo "  (build skipped — run 'pnpm build' first)"
echo ""

# Start each agent
start_agent "planner"    "node packages/agents/planner/dist/index.js"
start_agent "researcher" "node packages/agents/researcher/dist/index.js"
start_agent "executor"   "node packages/agents/executor/dist/index.js"
start_agent "evaluator"  "node packages/agents/evaluator/dist/index.js"
start_agent "evolution"  "node packages/agents/evolution/dist/index.js"

echo ""
echo "All 5 agents started. Check logs/ for output."
echo ""
echo "AXL API ports:"
echo "  planner:    http://127.0.0.1:9002"
echo "  researcher: http://127.0.0.1:9012"
echo "  executor:   http://127.0.0.1:9022"
echo "  evaluator:  http://127.0.0.1:9032"
echo "  evolution:  http://127.0.0.1:9042"
echo ""
echo "Dashboard: pnpm --filter @neuralmesh/dashboard dev"
echo "Stop all:  bash scripts/demo/stop-all-agents.sh"
