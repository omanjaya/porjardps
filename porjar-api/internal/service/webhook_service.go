package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// Supported webhook events
const (
	EventMatchCompleted      = "match.completed"
	EventMatchLive           = "match.live"
	EventBracketGenerated    = "bracket.generated"
	EventTeamRegistered      = "team.registered"
	EventLobbyResults        = "lobby.results"
	EventTournamentCompleted = "tournament.completed"
)

// AllWebhookEvents returns all supported event names
func AllWebhookEvents() []string {
	return []string{
		EventMatchCompleted,
		EventMatchLive,
		EventBracketGenerated,
		EventTeamRegistered,
		EventLobbyResults,
		EventTournamentCompleted,
	}
}

type WebhookService struct {
	webhookRepo    model.WebhookRepository
	webhookLogRepo model.WebhookLogRepository
	httpClient     *http.Client
}

func NewWebhookService(webhookRepo model.WebhookRepository, webhookLogRepo model.WebhookLogRepository) *WebhookService {
	// Use a custom transport that validates resolved IPs at dial time to prevent
	// DNS rebinding SSRF attacks. An attacker could register a webhook with a
	// public IP, then later change the DNS to point to a private/loopback address.
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, fmt.Errorf("invalid address %s: %w", addr, err)
			}
			_ = port // used implicitly via addr below

			ips, err := net.DefaultResolver.LookupHost(ctx, host)
			if err != nil {
				return nil, fmt.Errorf("DNS resolution failed for %s: %w", host, err)
			}

			for _, ipStr := range ips {
				ip := net.ParseIP(ipStr)
				if ip == nil {
					continue
				}
				if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
					return nil, fmt.Errorf("webhook target %s resolves to blocked IP %s", host, ipStr)
				}
			}

			dialer := &net.Dialer{Timeout: 10 * time.Second}
			return dialer.DialContext(ctx, network, addr)
		},
	}

	return &WebhookService{
		webhookRepo:    webhookRepo,
		webhookLogRepo: webhookLogRepo,
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   15 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return fmt.Errorf("stopped after 3 redirects")
				}
				return nil
			},
		},
	}
}

// TriggerEvent finds all active webhooks subscribed to the given event and sends
// an HTTP POST to each URL with the JSON payload and HMAC signature header.
// Each webhook delivery is dispatched in a separate goroutine.
func (s *WebhookService) TriggerEvent(ctx context.Context, eventName string, payload interface{}) error {
	webhooks, err := s.webhookRepo.FindActiveByEvent(ctx, eventName)
	if err != nil {
		return fmt.Errorf("find webhooks for event %s: %w", eventName, err)
	}

	if len(webhooks) == 0 {
		return nil
	}

	payloadBytes, err := json.Marshal(map[string]interface{}{
		"event":      eventName,
		"data":       payload,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"delivery_id": uuid.New().String(),
	})
	if err != nil {
		return fmt.Errorf("marshal webhook payload: %w", err)
	}

	for _, wh := range webhooks {
		go s.deliverWebhook(wh, eventName, payloadBytes)
	}

	return nil
}

// deliverWebhook sends the HTTP POST to a single webhook and logs the result.
func (s *WebhookService) deliverWebhook(wh *model.Webhook, event string, payloadBytes []byte) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, wh.URL, bytes.NewReader(payloadBytes))
	if err != nil {
		slog.Error("failed to create webhook request", "webhook_id", wh.ID, "error", err)
		s.logDelivery(ctx, wh.ID, event, payloadBytes, nil, "", 0, false)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "PORJAR-Webhook/1.0")
	req.Header.Set("X-Webhook-Event", event)

	// Compute HMAC-SHA256 signature if secret is present
	if wh.Secret != nil && *wh.Secret != "" {
		mac := hmac.New(sha256.New, []byte(*wh.Secret))
		mac.Write(payloadBytes)
		signature := hex.EncodeToString(mac.Sum(nil))
		req.Header.Set("X-Webhook-Signature", "sha256="+signature)
	}

	resp, err := s.httpClient.Do(req)
	durationMs := int(time.Since(start).Milliseconds())

	if err != nil {
		slog.Error("webhook delivery failed", "webhook_id", wh.ID, "event", event, "error", err)
		s.logDelivery(ctx, wh.ID, event, payloadBytes, nil, err.Error(), durationMs, false)
		if err := s.webhookRepo.IncrementFailureCount(ctx, wh.ID); err != nil {
			slog.Error("failed to increment failure count", "webhook_id", wh.ID, "error", err)
		}
		return
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	respBody := string(bodyBytes)
	success := resp.StatusCode >= 200 && resp.StatusCode < 300

	s.logDelivery(ctx, wh.ID, event, payloadBytes, &resp.StatusCode, respBody, durationMs, success)
	if err := s.webhookRepo.UpdateLastTriggered(ctx, wh.ID); err != nil {
		slog.Error("failed to update last triggered", "webhook_id", wh.ID, "error", err)
	}

	if success {
		if err := s.webhookRepo.ResetFailureCount(ctx, wh.ID); err != nil {
			slog.Error("failed to reset failure count", "webhook_id", wh.ID, "error", err)
		}
	} else {
		if err := s.webhookRepo.IncrementFailureCount(ctx, wh.ID); err != nil {
			slog.Error("failed to increment failure count", "webhook_id", wh.ID, "error", err)
		}
		slog.Warn("webhook returned non-2xx", "webhook_id", wh.ID, "status", resp.StatusCode)
	}
}

func (s *WebhookService) logDelivery(ctx context.Context, webhookID uuid.UUID, event string, payload []byte, statusCode *int, respBody string, durationMs int, success bool) {
	var respBodyPtr *string
	if respBody != "" {
		respBodyPtr = &respBody
	}
	var durationPtr *int
	if durationMs > 0 {
		durationPtr = &durationMs
	}

	log := &model.WebhookLog{
		ID:             uuid.New(),
		WebhookID:      webhookID,
		Event:          event,
		Payload:        payload,
		ResponseStatus: statusCode,
		ResponseBody:   respBodyPtr,
		DurationMs:     durationPtr,
		Success:        success,
		CreatedAt:      time.Now(),
	}

	if err := s.webhookLogRepo.Create(ctx, log); err != nil {
		slog.Error("failed to save webhook log", "webhook_id", webhookID, "error", err)
	}
}

// SendTestPayload sends a test event to a specific webhook
func (s *WebhookService) SendTestPayload(ctx context.Context, webhookID uuid.UUID) error {
	wh, err := s.webhookRepo.FindByID(ctx, webhookID)
	if err != nil {
		return fmt.Errorf("find webhook: %w", err)
	}
	if wh == nil {
		return fmt.Errorf("webhook not found")
	}

	testPayload, _ := json.Marshal(map[string]interface{}{
		"event":      "webhook.test",
		"data":       map[string]string{"message": "This is a test webhook delivery from PORJAR"},
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"delivery_id": uuid.New().String(),
	})

	go s.deliverWebhook(wh, "webhook.test", testPayload)
	return nil
}
