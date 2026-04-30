// Package config loads and validates AXL agent configuration from environment variables.
//
// Port semantics:
//   - APIPort  (AXL_API_PORT, default 9002): HTTP bridge — all app code talks here.
//   - TCPPort  (AXL_TCP_PORT, default 7000): Yggdrasil internal P2P — NEVER exposed to app code.
//   - BridgeAddr MUST be "127.0.0.1" — "0.0.0.0" would expose the HTTP API to the network.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// AXLConfig holds every parameter needed to launch and connect to the AXL subprocess.
type AXLConfig struct {
	// APIPort is the HTTP bridge port that all application code uses to talk to AXL.
	// Corresponds to the AXL_API_PORT environment variable (default: 9002).
	APIPort int

	// TCPPort is the Yggdrasil internal P2P port. Application code NEVER touches this.
	// Corresponds to the AXL_TCP_PORT environment variable (default: 7000).
	TCPPort int

	// KeyPath is the path to the ed25519 PEM private key file.
	// Generated with: openssl genpkey -algorithm ed25519 -out agent.pem
	// Corresponds to the AXL_KEY_PATH environment variable.
	KeyPath string

	// BridgeAddr is the interface the AXL HTTP bridge binds to.
	// MUST be "127.0.0.1" — never "0.0.0.0" (would expose the API to the network).
	BridgeAddr string

	// AgentName is a human-readable label for this agent instance (e.g. "planner").
	// Corresponds to the AGENT_NAME environment variable.
	AgentName string
}

// Load reads configuration from environment variables.
//
// Environment variables:
//   - AXL_API_PORT  — HTTP bridge port (default: 9002)
//   - AXL_TCP_PORT  — Yggdrasil internal port (default: 7000)
//   - AXL_KEY_PATH  — path to ed25519 PEM key (required)
//   - AXL_BRIDGE_ADDR — bind address (default: "127.0.0.1", MUST stay 127.0.0.1)
//   - AGENT_NAME    — human label for this agent (default: "agent")
func Load() (*AXLConfig, error) {
	cfg := &AXLConfig{
		APIPort:    9002,
		TCPPort:    7000,
		BridgeAddr: "127.0.0.1",
		AgentName:  "agent",
	}

	if v := os.Getenv("AXL_API_PORT"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("config: AXL_API_PORT %q is not a valid integer: %w", v, err)
		}
		cfg.APIPort = n
	}

	if v := os.Getenv("AXL_TCP_PORT"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("config: AXL_TCP_PORT %q is not a valid integer: %w", v, err)
		}
		cfg.TCPPort = n
	}

	if v := os.Getenv("AXL_KEY_PATH"); v != "" {
		cfg.KeyPath = v
	}

	if v := os.Getenv("AXL_BRIDGE_ADDR"); v != "" {
		cfg.BridgeAddr = v
	}

	if v := os.Getenv("AGENT_NAME"); v != "" {
		cfg.AgentName = v
	}

	return cfg, nil
}

// Validate checks that the configuration is safe and complete before use.
//
// Rules enforced:
//   - BridgeAddr MUST be "127.0.0.1" (binding to 0.0.0.0 exposes the HTTP API to the network)
//   - APIPort and TCPPort must be in the valid range 1–65535
//   - APIPort and TCPPort must be different
//   - KeyPath must be set and the file must exist
//   - AgentName must not be empty
func (c *AXLConfig) Validate() error {
	if c.BridgeAddr != "127.0.0.1" {
		return fmt.Errorf(
			"config: BridgeAddr is %q — MUST be \"127.0.0.1\"; "+
				"binding to 0.0.0.0 would expose the AXL HTTP API to the network",
			c.BridgeAddr,
		)
	}

	if c.APIPort < 1 || c.APIPort > 65535 {
		return fmt.Errorf("config: APIPort %d is out of range [1, 65535]", c.APIPort)
	}

	if c.TCPPort < 1 || c.TCPPort > 65535 {
		return fmt.Errorf("config: TCPPort %d is out of range [1, 65535]", c.TCPPort)
	}

	if c.APIPort == c.TCPPort {
		return fmt.Errorf("config: APIPort and TCPPort must be different (both are %d)", c.APIPort)
	}

	if c.KeyPath == "" {
		return fmt.Errorf("config: KeyPath is empty — set AXL_KEY_PATH to the ed25519 PEM file path")
	}

	if _, err := os.Stat(c.KeyPath); os.IsNotExist(err) {
		return fmt.Errorf(
			"config: key file %q does not exist — "+
				"generate it with: openssl genpkey -algorithm ed25519 -out %s",
			c.KeyPath, c.KeyPath,
		)
	} else if err != nil {
		return fmt.Errorf("config: cannot stat key file %q: %w", c.KeyPath, err)
	}

	if c.AgentName == "" {
		return fmt.Errorf("config: AgentName is empty — set AGENT_NAME")
	}

	return nil
}
