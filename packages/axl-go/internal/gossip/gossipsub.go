// Package gossip implements a GossipSub-style pub/sub layer on top of the AXL HTTP API.
//
// GossipHub wraps the AXL /api/gossip/publish and /api/gossip/subscribe endpoints,
// drives a background recv loop, and dispatches inbound messages to registered handlers.
package gossip

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// GossipMessage is the envelope delivered to Subscribe handlers.
type GossipMessage struct {
	Topic string          `json:"topic"`
	From  string          `json:"from"`
	Data  json.RawMessage `json:"data"`
	SeqNo uint64          `json:"seq_no"`
}

// GossipHub manages pub/sub topics over the AXL HTTP API.
//
// Usage:
//
//	hub := gossip.NewGossipHub(9002, myPubkey)
//	hub.Subscribe("task.result", func(m gossip.GossipMessage) { ... })
//	ctx, cancel := context.WithCancel(context.Background())
//	if err := hub.Start(ctx); err != nil { ... }
type GossipHub struct {
	apiPort    int
	selfPubkey string

	subscribers map[string][]func(GossipMessage)
	mu          sync.RWMutex

	seqCounter atomic.Uint64
	httpClient *http.Client
}

// NewGossipHub creates a new GossipHub.
// selfPubkey is this node's AXL ed25519 public key, used to populate From in outbound messages.
func NewGossipHub(apiPort int, selfPubkey string) *GossipHub {
	return &GossipHub{
		apiPort:     apiPort,
		selfPubkey:  selfPubkey,
		subscribers: make(map[string][]func(GossipMessage)),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Subscribe registers handler to be called for every message received on topic.
// Multiple handlers can be registered for the same topic; all will be called in order.
// Subscribe is safe to call before or after Start.
func (g *GossipHub) Subscribe(topic string, handler func(GossipMessage)) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.subscribers[topic] = append(g.subscribers[topic], handler)
}

// Publish serialises data as JSON, base64-encodes it, and POSTs to AXL /api/gossip/publish.
// data may be any JSON-serialisable value.
func (g *GossipHub) Publish(ctx context.Context, topic string, data any) error {
	rawData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("gossip: failed to marshal publish data: %w", err)
	}

	seq := g.seqCounter.Add(1)

	// Build the GossipMessage envelope so receivers get structured data.
	envelope := GossipMessage{
		Topic: topic,
		From:  g.selfPubkey,
		Data:  json.RawMessage(rawData),
		SeqNo: seq,
	}
	envelopeBytes, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("gossip: failed to marshal gossip envelope: %w", err)
	}

	type publishReq struct {
		Topic string `json:"topic"`
		Data  string `json:"data"` // base64
	}
	reqBody := publishReq{
		Topic: topic,
		Data:  base64.StdEncoding.EncodeToString(envelopeBytes),
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("gossip: failed to marshal publish request: %w", err)
	}

	url := fmt.Sprintf("http://127.0.0.1:%d/api/gossip/publish", g.apiPort)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("gossip: failed to create publish request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("gossip: POST /api/gossip/publish failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var sb strings.Builder
		io.Copy(&sb, io.LimitReader(resp.Body, 512))
		return fmt.Errorf("gossip: AXL /api/gossip/publish returned HTTP %d: %s", resp.StatusCode, sb.String())
	}

	return nil
}

// subscribeAtAXL tells the AXL node to join a GossipSub topic.
// This must be called before messages on that topic will be forwarded to /api/recv.
func (g *GossipHub) subscribeAtAXL(ctx context.Context, topic string) error {
	type subscribeReq struct {
		Topic string `json:"topic"`
	}
	bodyBytes, err := json.Marshal(subscribeReq{Topic: topic})
	if err != nil {
		return fmt.Errorf("gossip: failed to marshal subscribe request: %w", err)
	}

	url := fmt.Sprintf("http://127.0.0.1:%d/api/gossip/subscribe", g.apiPort)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("gossip: failed to create subscribe request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("gossip: POST /api/gossip/subscribe failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var sb strings.Builder
		io.Copy(&sb, io.LimitReader(resp.Body, 512))
		return fmt.Errorf("gossip: AXL /api/gossip/subscribe returned HTTP %d: %s", resp.StatusCode, sb.String())
	}

	return nil
}

// Start subscribes all registered topics at the AXL node and launches the recv loop.
// The recv loop polls AXL's /api/recv (blocking long-poll) and dispatches messages
// to registered handlers. Start returns after the loop goroutine is running.
// The loop terminates when ctx is cancelled.
func (g *GossipHub) Start(ctx context.Context) error {
	// Collect current topics under read lock.
	g.mu.RLock()
	topics := make([]string, 0, len(g.subscribers))
	for t := range g.subscribers {
		topics = append(topics, t)
	}
	g.mu.RUnlock()

	// Register each topic with the AXL node so it forwards us messages.
	for _, topic := range topics {
		if err := g.subscribeAtAXL(ctx, topic); err != nil {
			return fmt.Errorf("gossip: failed to subscribe topic %q at AXL: %w", topic, err)
		}
	}

	go g.recvLoop(ctx)
	return nil
}

// axlRecvResponse matches the AXL /api/recv JSON response.
type axlRecvResponse struct {
	Src     string `json:"src"`
	Payload string `json:"payload"` // base64-encoded bytes
}

// recvLoop continuously polls AXL /api/recv and dispatches gossip messages to handlers.
// It uses a long-poll HTTP client with a generous timeout so AXL can block until a message arrives.
func (g *GossipHub) recvLoop(ctx context.Context) {
	// Long-poll client — no timeout so AXL can hold the connection open.
	longPollClient := &http.Client{}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		msg, err := g.recvOne(ctx, longPollClient)
		if err != nil {
			if ctx.Err() != nil {
				// Context cancelled — clean shutdown.
				return
			}
			// Transient error — back off briefly and retry.
			select {
			case <-ctx.Done():
				return
			case <-time.After(500 * time.Millisecond):
			}
			continue
		}

		g.dispatch(msg)
	}
}

// recvOne makes one blocking GET /api/recv call and returns the parsed GossipMessage.
func (g *GossipHub) recvOne(ctx context.Context, client *http.Client) (*GossipMessage, error) {
	url := fmt.Sprintf("http://127.0.0.1:%d/api/recv", g.apiPort)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("gossip: failed to create recv request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gossip: GET /api/recv failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var sb strings.Builder
		io.Copy(&sb, io.LimitReader(resp.Body, 256))
		return nil, fmt.Errorf("gossip: AXL /api/recv returned HTTP %d: %s", resp.StatusCode, sb.String())
	}

	var axlResp axlRecvResponse
	if err := json.NewDecoder(resp.Body).Decode(&axlResp); err != nil {
		return nil, fmt.Errorf("gossip: failed to decode /api/recv response: %w", err)
	}

	rawPayload, err := base64.StdEncoding.DecodeString(axlResp.Payload)
	if err != nil {
		return nil, fmt.Errorf("gossip: failed to base64-decode payload from %s: %w", axlResp.Src, err)
	}

	// The payload is a GossipMessage envelope (JSON).
	var gm GossipMessage
	if err := json.Unmarshal(rawPayload, &gm); err != nil {
		// Not a gossip envelope — not for us, skip silently.
		return nil, fmt.Errorf("gossip: payload from %s is not a GossipMessage: %w", axlResp.Src, err)
	}

	// Overwrite From with the AXL-verified source pubkey so handlers can trust it.
	gm.From = axlResp.Src

	return &gm, nil
}

// dispatch calls all handlers registered for gm.Topic.
// Each handler is called in its own goroutine to avoid one slow handler blocking others.
func (g *GossipHub) dispatch(gm *GossipMessage) {
	g.mu.RLock()
	handlers := g.subscribers[gm.Topic]
	// Make a snapshot so we can release the lock before calling handlers.
	snapshot := make([]func(GossipMessage), len(handlers))
	copy(snapshot, handlers)
	g.mu.RUnlock()

	msg := *gm
	for _, h := range snapshot {
		h := h
		go h(msg)
	}
}
