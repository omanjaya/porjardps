package handler

import (
	"crypto/sha256"
	"encoding/hex"

	"github.com/gofiber/fiber/v2"

	"github.com/porjar-denpasar/porjar-api/internal/pkg/errlog"
)

// ObservabilityHandler groups the lightweight endpoints used for client-side
// error reporting and privacy-respecting page-view analytics. All payloads are
// size-bounded and written to append-only log files via the errlog package.
type ObservabilityHandler struct{}

func NewObservabilityHandler() *ObservabilityHandler {
	return &ObservabilityHandler{}
}

type clientErrorPayload struct {
	Message   string `json:"message"`
	Stack     string `json:"stack"`
	URL       string `json:"url"`
	UserAgent string `json:"user_agent"`
	Timestamp string `json:"timestamp"`
}

// ReportError accepts a client-side error report.
// POST /errors/report (public, rate-limited).
func (h *ObservabilityHandler) ReportError(c *fiber.Ctx) error {
	var p clientErrorPayload
	if err := c.BodyParser(&p); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}
	// Bound field sizes to avoid log flooding.
	if len(p.Message) > 1000 {
		p.Message = p.Message[:1000]
	}
	if len(p.Stack) > 4000 {
		p.Stack = p.Stack[:4000]
	}
	if len(p.URL) > 500 {
		p.URL = p.URL[:500]
	}
	if len(p.UserAgent) > 300 {
		p.UserAgent = p.UserAgent[:300]
	}

	_ = errlog.LogClient(map[string]any{
		"message":    p.Message,
		"stack":      p.Stack,
		"url":        p.URL,
		"user_agent": p.UserAgent,
		"timestamp":  p.Timestamp,
		"ip_hash":    hashIP(c.IP()),
	})
	return c.SendStatus(fiber.StatusNoContent)
}

type pageviewPayload struct {
	Path      string `json:"path"`
	Referrer  string `json:"referrer"`
	UserAgent string `json:"user_agent"`
	Timestamp string `json:"timestamp"`
}

// PageView accepts an anonymous page-view event.
// POST /analytics/pageview (public, rate-limited).
func (h *ObservabilityHandler) PageView(c *fiber.Ctx) error {
	var p pageviewPayload
	if err := c.BodyParser(&p); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}
	if len(p.Path) > 300 {
		p.Path = p.Path[:300]
	}
	if len(p.Referrer) > 300 {
		p.Referrer = p.Referrer[:300]
	}
	if len(p.UserAgent) > 300 {
		p.UserAgent = p.UserAgent[:300]
	}

	_ = errlog.LogAnalytics(map[string]any{
		"path":       p.Path,
		"referrer":   p.Referrer,
		"user_agent": p.UserAgent,
		"timestamp":  p.Timestamp,
		"ip_hash":    hashIP(c.IP()),
	})
	return c.SendStatus(fiber.StatusNoContent)
}

// hashIP returns a SHA-256 hex digest of the IP. We never store the raw IP.
func hashIP(ip string) string {
	sum := sha256.Sum256([]byte("porjar-salt:" + ip))
	return hex.EncodeToString(sum[:16])
}
