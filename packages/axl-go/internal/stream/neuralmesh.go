// Package stream implements the NeuralMesh custom message stream over AXL.
//
// Wire format: 4-byte big-endian uint32 length prefix followed by the JSON payload bytes.
// AXL routes messages whose JSON body contains "neuralmesh":true to the NeuralMesh queue.
package stream

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// NeuralMeshMessage is the envelope for all NeuralMesh stream messages.
//
// The "neuralmesh":true field causes the AXL multiplexer to route this message
// to the NeuralMesh custom queue instead of the default message queue or MCP router.
type NeuralMeshMessage struct {
	// NeuralMesh MUST be true — this is the AXL multiplexer discriminator.
	NeuralMesh bool `json:"neuralmesh"`

	// Topic is the application-level pub/sub topic (e.g. "task.assign", "result.ready").
	Topic string `json:"topic"`

	// From is the sender's AXL ed25519 public key (hex-encoded).
	From string `json:"from"`

	// Payload is the application payload — any valid JSON value.
	Payload json.RawMessage `json:"payload"`

	// Timestamp is Unix milliseconds at message creation.
	Timestamp int64 `json:"timestamp"`
}

// NewMessage constructs a NeuralMeshMessage with NeuralMesh=true and the current timestamp.
// payload must be valid JSON; pass json.RawMessage(`null`) if no payload is needed.
func NewMessage(topic, from string, payload json.RawMessage) *NeuralMeshMessage {
	return &NeuralMeshMessage{
		NeuralMesh: true,
		Topic:      topic,
		From:       from,
		Payload:    payload,
		Timestamp:  time.Now().UnixMilli(),
	}
}

// Encode marshals msg to JSON and prepends a 4-byte big-endian uint32 length prefix.
//
// Wire format:
//
//	[0:4]  — uint32 big-endian: byte length of the JSON body
//	[4:4+n] — JSON bytes
func Encode(msg *NeuralMeshMessage) ([]byte, error) {
	if !msg.NeuralMesh {
		return nil, fmt.Errorf("stream: NeuralMeshMessage.NeuralMesh must be true (AXL multiplexer discriminator)")
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return nil, fmt.Errorf("stream: failed to marshal NeuralMeshMessage: %w", err)
	}

	if len(body) > 0xFFFFFFFF {
		return nil, fmt.Errorf("stream: encoded message too large (%d bytes, max 4 GiB)", len(body))
	}

	out := make([]byte, 4+len(body))
	binary.BigEndian.PutUint32(out[:4], uint32(len(body)))
	copy(out[4:], body)
	return out, nil
}

// Decode reads one length-prefixed NeuralMesh message from r.
//
// It reads exactly 4 bytes for the length prefix, then reads that many bytes
// for the JSON body, then unmarshals into a NeuralMeshMessage.
// Returns io.EOF if r is exhausted before a complete message is read.
func Decode(r io.Reader) (*NeuralMeshMessage, error) {
	var lenBuf [4]byte
	if _, err := io.ReadFull(r, lenBuf[:]); err != nil {
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			return nil, io.EOF
		}
		return nil, fmt.Errorf("stream: failed to read length prefix: %w", err)
	}

	msgLen := binary.BigEndian.Uint32(lenBuf[:])
	if msgLen == 0 {
		return nil, fmt.Errorf("stream: received zero-length message")
	}
	// Guard against absurdly large messages (64 MiB limit).
	const maxMsg = 64 * 1024 * 1024
	if msgLen > maxMsg {
		return nil, fmt.Errorf("stream: message length %d exceeds maximum %d bytes", msgLen, maxMsg)
	}

	body := make([]byte, msgLen)
	if _, err := io.ReadFull(r, body); err != nil {
		return nil, fmt.Errorf("stream: failed to read message body (%d bytes): %w", msgLen, err)
	}

	var msg NeuralMeshMessage
	if err := json.Unmarshal(body, &msg); err != nil {
		return nil, fmt.Errorf("stream: failed to unmarshal NeuralMeshMessage: %w", err)
	}

	return &msg, nil
}

// axlSendRequest matches the AXL /api/send JSON body.
type axlSendRequest struct {
	Dst     string `json:"dst"`
	Payload string `json:"payload"` // base64-encoded bytes
}

// Send encodes msg using the length-prefix wire format, base64-encodes the result,
// and POSTs it to the AXL HTTP bridge at /api/send.
//
// The AXL multiplexer on the receiving end will inspect the JSON body and route
// messages with "neuralmesh":true to the NeuralMesh custom queue.
func Send(ctx context.Context, apiPort int, dstPubkey string, msg *NeuralMeshMessage) error {
	if dstPubkey == "" {
		return fmt.Errorf("stream: dstPubkey must not be empty")
	}

	wire, err := Encode(msg)
	if err != nil {
		return fmt.Errorf("stream: encode failed: %w", err)
	}

	reqBody := axlSendRequest{
		Dst:     dstPubkey,
		Payload: base64.StdEncoding.EncodeToString(wire),
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("stream: failed to marshal send request: %w", err)
	}

	url := fmt.Sprintf("http://127.0.0.1:%d/api/send", apiPort)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("stream: failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("stream: POST /api/send failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var sb strings.Builder
		io.Copy(&sb, io.LimitReader(resp.Body, 512))
		return fmt.Errorf("stream: AXL /api/send returned HTTP %d: %s", resp.StatusCode, sb.String())
	}

	return nil
}
