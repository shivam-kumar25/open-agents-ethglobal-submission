#!/usr/bin/env bash
set -euo pipefail

# Generate ed25519 keys for all 5 NeuralMesh agents
# AXL requires ed25519 PEM format — use openssl

KEYS_DIR="packages/agents/shared/axl-keys"
mkdir -p "$KEYS_DIR"

AGENTS=(planner researcher executor evaluator evolution)

for agent in "${AGENTS[@]}"; do
  KEY_FILE="$KEYS_DIR/$agent.pem"
  if [ -f "$KEY_FILE" ]; then
    echo "✓ $agent.pem already exists"
  else
    openssl genpkey -algorithm ed25519 -out "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "✓ Generated $agent.pem"
  fi
done

echo ""
echo "All AXL keys generated in $KEYS_DIR"
echo "IMPORTANT: These are private keys. They are in .gitignore and will NOT be committed."
echo "Back them up securely."
