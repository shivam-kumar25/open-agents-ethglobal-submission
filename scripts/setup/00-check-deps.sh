#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo "NeuralMesh — Dependency Check"
echo "=============================="

# Node.js — MUST be >= 22 (0g fine-tuning CLI requires Node 22+)
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ]; then
  fail "Node.js not found. Install Node.js 22+: https://nodejs.org"
elif [ "$NODE_VERSION" -lt 22 ]; then
  fail "Node.js $NODE_VERSION found but 22+ required (0g fine-tuning CLI needs Node 22). Install: https://nodejs.org"
else
  ok "Node.js v$(node --version | sed 's/v//')"
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found. Installing..."
  npm install -g pnpm
fi
ok "pnpm $(pnpm --version)"

# Go — optional, only needed to build AXL binary; NOT required for agents to run
GO_VERSION=$(go version 2>/dev/null | awk '{print $3}' | sed 's/go//')
GO_MAJOR=$(echo "$GO_VERSION" | cut -d. -f1)
GO_MINOR=$(echo "$GO_VERSION" | cut -d. -f2)
if [ -z "$GO_VERSION" ]; then
  warn "Go not found — optional, only needed to build AXL binary. Install Go 1.25.x: https://go.dev/dl/"
elif [ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -ge 26 ]; then
  warn "Go $GO_VERSION found — 1.26+ breaks AXL gVisor build tags. Use Go 1.25.x: export GOTOOLCHAIN=go1.25.5"
else
  ok "Go $GO_VERSION"
fi

# git
if ! command -v git &>/dev/null; then
  fail "git not found"
fi
ok "git $(git --version | awk '{print $3}')"

# .env file
if [ ! -f .env ]; then
  warn ".env not found. Copying from .env.example..."
  cp .env.example .env
  warn "Fill in .env before running agents!"
else
  ok ".env exists"
fi

echo ""
echo "All dependency checks passed."
echo "Next: bash scripts/setup/01-generate-axl-keys.sh"
