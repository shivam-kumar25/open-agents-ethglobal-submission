#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AGENTS=(planner researcher executor evaluator evolution)
for agent in "${AGENTS[@]}"; do
  PID_FILE="$ROOT/logs/$agent.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null && echo "Stopped $agent (PID $PID)" || echo "$agent already stopped"
    rm -f "$PID_FILE"
  fi
done
echo "All agents stopped."
