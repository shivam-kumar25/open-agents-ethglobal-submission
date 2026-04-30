// Package client provides a thin HTTP client for the AXL local API.
//
// All communication goes through the HTTP bridge on api_port (default 9002).
// The tcp_port (Yggdrasil internal) is NEVER used by this package.
// BaseURL is always http://127.0.0.1:<api_port> — never 0.0.0.0.
package client

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Message is a message received from the AXL /api/recv endpoint.
type Message struct {
	// Src is the sender's AXL ed25519 public key (hex-encoded).
	Src string `json:"src"`

	// Payload is the raw message bytes, decoded from the base64 that AXL sends over the wire.
	Payload []byte
}

// SelfInfo is returned by the AXL /api/self endpoint.
type SelfInfo struct {
	Pubkey  string `json:"pubkey"`
	Address string `json:"address"`
}

// PeerInfo describes a peer in the AXL mesh.
type PeerInfo struct {
	Pubkey  string `json:"pubkey"`
	Address string `json:"address"`
	Online  bool   `json:"online"`
}

// TopologyInfo is returned by the AXL /api/topology endpoint.
type TopologyInfo struct {
	Self  SelfInfo   `json:"self"`
	Peers []PeerInfo `json:"peers"`
}

// AXLClient is a thin HTTP client for the AXL local API.
// All requests go to 127.0.0.1:<APIPort> — never to the network.
type AXLClient struct {
	// BaseURL is http://127.0.0.1:<api_port>.
	BaseURL string

	// http is the underlying HTTP client. Exported only for testing overrides.
	http *http.Client
}

// New creates an AXLClient pointed at http://127.0.0.1:<apiPort>.
func New(apiPort int) *AXLClient {
	return &AXLClient{
		BaseURL: fmt.Sprintf("http://127.0.0.1:%d", apiPort),
		http: &http.Client{
			// 30 s for regular calls; Recv uses its own no-timeout client.
			Timeout: 30 * time.Second,
		},
	}
}

// Send POSTs a message to dstPubkey via the AXL /api/send endpoint.
// payload is base64-encoded before transmission.
func (c *AXLClient) Send(ctx context.Context, dstPubkey string, payload []byte) error {
	if dstPubkey == "" {
		return fmt.Errorf("axlclient: dstPubkey must not be empty")
	}

	type sendReq struct {
		Dst     string `json:"dst"`
		Payload string `json:"payload"` // base64
	}
	body, err := json.Marshal(sendReq{
		Dst:     dstPubkey,
		Payload: base64.StdEncoding.EncodeToString(payload),
	})
	if err != nil {
		return fmt.Errorf("axlclient: failed to marshal send request: %w", err)
	}

	return c.postJSON(ctx, "/api/send", body, nil)
}

// Recv performs a blocking GET /api/recv and returns the next inbound message.
// AXL holds the connection open until a message arrives. The call respects ctx cancellation.
func (c *AXLClient) Recv(ctx context.Context) (*Message, error) {
	// Use a dedicated client with no timeout for the long-poll.
	longPollClient := &http.Client{}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/api/recv", nil)
	if err != nil {
		return nil, fmt.Errorf("axlclient: failed to create recv request: %w", err)
	}

	resp, err := longPollClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("axlclient: GET /api/recv failed: %w", err)
	}
	defer resp.Body.Close()

	if err := checkStatus(resp, "/api/recv"); err != nil {
		return nil, err
	}

	type recvResp struct {
		Src     string `json:"src"`
		Payload string `json:"payload"` // base64
	}
	var r recvResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return nil, fmt.Errorf("axlclient: failed to decode /api/recv response: %w", err)
	}

	raw, err := base64.StdEncoding.DecodeString(r.Payload)
	if err != nil {
		return nil, fmt.Errorf("axlclient: failed to base64-decode payload from %s: %w", r.Src, err)
	}

	return &Message{Src: r.Src, Payload: raw}, nil
}

// Self returns this node's public key and Yggdrasil address from /api/self.
func (c *AXLClient) Self(ctx context.Context) (*SelfInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/api/self", nil)
	if err != nil {
		return nil, fmt.Errorf("axlclient: failed to create self request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("axlclient: GET /api/self failed: %w", err)
	}
	defer resp.Body.Close()

	if err := checkStatus(resp, "/api/self"); err != nil {
		return nil, err
	}

	var info SelfInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("axlclient: failed to decode /api/self response: %w", err)
	}
	return &info, nil
}

// Peers returns the list of known peers from /api/peers.
func (c *AXLClient) Peers(ctx context.Context) ([]PeerInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/api/peers", nil)
	if err != nil {
		return nil, fmt.Errorf("axlclient: failed to create peers request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("axlclient: GET /api/peers failed: %w", err)
	}
	defer resp.Body.Close()

	if err := checkStatus(resp, "/api/peers"); err != nil {
		return nil, err
	}

	var peers []PeerInfo
	if err := json.NewDecoder(resp.Body).Decode(&peers); err != nil {
		return nil, fmt.Errorf("axlclient: failed to decode /api/peers response: %w", err)
	}
	return peers, nil
}

// Topology returns the full mesh topology from /api/topology.
func (c *AXLClient) Topology(ctx context.Context) (*TopologyInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/api/topology", nil)
	if err != nil {
		return nil, fmt.Errorf("axlclient: failed to create topology request: %w", err)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("axlclient: GET /api/topology failed: %w", err)
	}
	defer resp.Body.Close()

	if err := checkStatus(resp, "/api/topology"); err != nil {
		return nil, err
	}

	var topo TopologyInfo
	if err := json.NewDecoder(resp.Body).Decode(&topo); err != nil {
		return nil, fmt.Errorf("axlclient: failed to decode /api/topology response: %w", err)
	}
	return &topo, nil
}

// GossipPublish publishes data to a GossipSub topic via /api/gossip/publish.
// data is base64-encoded before transmission.
func (c *AXLClient) GossipPublish(ctx context.Context, topic string, data []byte) error {
	if topic == "" {
		return fmt.Errorf("axlclient: topic must not be empty")
	}

	type publishReq struct {
		Topic string `json:"topic"`
		Data  string `json:"data"` // base64
	}
	body, err := json.Marshal(publishReq{
		Topic: topic,
		Data:  base64.StdEncoding.EncodeToString(data),
	})
	if err != nil {
		return fmt.Errorf("axlclient: failed to marshal gossip publish request: %w", err)
	}

	return c.postJSON(ctx, "/api/gossip/publish", body, nil)
}

// GossipSubscribe joins a GossipSub topic via /api/gossip/subscribe.
// After subscribing, messages on the topic will be delivered via /api/recv.
func (c *AXLClient) GossipSubscribe(ctx context.Context, topic string) error {
	if topic == "" {
		return fmt.Errorf("axlclient: topic must not be empty")
	}

	type subscribeReq struct {
		Topic string `json:"topic"`
	}
	body, err := json.Marshal(subscribeReq{Topic: topic})
	if err != nil {
		return fmt.Errorf("axlclient: failed to marshal gossip subscribe request: %w", err)
	}

	return c.postJSON(ctx, "/api/gossip/subscribe", body, nil)
}

// postJSON is a helper that POSTs rawBody to path, optionally decoding the response into dst.
// dst may be nil if the response body is not needed.
func (c *AXLClient) postJSON(ctx context.Context, path string, rawBody []byte, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+path, bytes.NewReader(rawBody))
	if err != nil {
		return fmt.Errorf("axlclient: failed to create request for %s: %w", path, err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("axlclient: POST %s failed: %w", path, err)
	}
	defer resp.Body.Close()

	if err := checkStatus(resp, path); err != nil {
		return err
	}

	if dst != nil {
		if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
			return fmt.Errorf("axlclient: failed to decode response from %s: %w", path, err)
		}
	}

	return nil
}

// checkStatus returns a descriptive error if resp.StatusCode is not 2xx.
func checkStatus(resp *http.Response, path string) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	var sb strings.Builder
	io.Copy(&sb, io.LimitReader(resp.Body, 512))
	return fmt.Errorf("axlclient: AXL %s returned HTTP %d: %s", path, resp.StatusCode, sb.String())
}
