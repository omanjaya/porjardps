package ws

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// Hub is a thin adapter that publishes events to Centrifugo via its HTTP API.
// It maintains the same interface as the previous in-process WebSocket hub so
// all service files remain unchanged.
type Hub struct {
	apiURL string // e.g. http://centrifugo:8000
	apiKey string
	client *http.Client
}

// NewHub creates a new Centrifugo publisher with the given API URL and key.
func NewHub(apiURL, apiKey string) *Hub {
	return &Hub{
		apiURL: apiURL,
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// NewHubWithLimit is kept for backward compatibility.
// maxConns is ignored — Centrifugo manages connection limits.
func NewHubWithLimit(_ int) *Hub {
	return &Hub{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// SetConfig configures the Centrifugo API endpoint after creation.
// Call this before the first broadcast.
func (h *Hub) SetConfig(apiURL, apiKey string) {
	h.apiURL = apiURL
	h.apiKey = apiKey
}

// Run is a no-op kept for backward compatibility with existing startup code.
func (h *Hub) Run() {}

// Stop is a no-op. Centrifugo manages its own connection lifecycle.
func (h *Hub) Stop() {}

// ConnectionCount always returns 0. Use Centrifugo's /health endpoint or
// Prometheus metrics for real connection counts.
func (h *Hub) ConnectionCount() int { return 0 }

// RoomConnectionCount always returns 0.
func (h *Hub) RoomConnectionCount(_ string) int { return 0 }

// BroadcastToRoom publishes data to a specific Centrifugo channel.
func (h *Hub) BroadcastToRoom(channel string, data []byte) {
	h.publish(channel, data)
}

// BroadcastToAll publishes data to the live-scores channel.
// All former usages of broadcast-to-all were global notifications that are
// appropriately scoped to the public live-scores channel.
func (h *Hub) BroadcastToAll(data []byte) {
	h.publish("live-scores", data)
}

type centrifugoPublishRequest struct {
	Method string                   `json:"method"`
	Params centrifugoPublishParams  `json:"params"`
}

type centrifugoPublishParams struct {
	Channel string          `json:"channel"`
	Data    json.RawMessage `json:"data"`
}

func (h *Hub) publish(channel string, data []byte) {
	if h.apiURL == "" {
		slog.Warn("centrifugo: apiURL is empty, skipping publish", "channel", channel)
		return
	}

	req := centrifugoPublishRequest{
		Method: "publish",
		Params: centrifugoPublishParams{
			Channel: channel,
			Data:    json.RawMessage(data),
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		slog.Error("centrifugo: marshal publish request", "error", err)
		return
	}

	httpReq, err := http.NewRequestWithContext(
		context.Background(),
		http.MethodPost,
		fmt.Sprintf("%s/api", h.apiURL),
		bytes.NewReader(body),
	)
	if err != nil {
		slog.Error("centrifugo: create request", "error", err)
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-API-Key", h.apiKey)

	resp, err := h.client.Do(httpReq)
	if err != nil {
		slog.Error("centrifugo: publish failed", "channel", channel, "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("centrifugo: publish non-200", "channel", channel, "status", resp.StatusCode)
	}
}
