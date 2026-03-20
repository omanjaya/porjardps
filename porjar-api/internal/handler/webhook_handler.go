package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

// validateWebhookURL checks the webhook URL against SSRF attacks by rejecting
// private IPs, loopback addresses, link-local addresses, and non-http(s) schemes.
func validateWebhookURL(rawURL string) error {
	const maxURLLength = 2048
	if len(rawURL) > maxURLLength {
		return fmt.Errorf("URL terlalu panjang (maksimal %d karakter)", maxURLLength)
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("URL tidak valid")
	}

	// Only allow http and https schemes
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("URL harus menggunakan skema http atau https")
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return fmt.Errorf("URL harus memiliki hostname")
	}

	// Reject localhost
	if strings.EqualFold(hostname, "localhost") {
		return fmt.Errorf("URL tidak boleh mengarah ke localhost")
	}

	// Resolve hostname to IPs
	ips, err := net.LookupHost(hostname)
	if err != nil {
		return fmt.Errorf("tidak dapat resolve hostname: %s", hostname)
	}

	for _, ipStr := range ips {
		ip := net.ParseIP(ipStr)
		if ip == nil {
			continue
		}
		if ip.IsLoopback() {
			return fmt.Errorf("URL tidak boleh mengarah ke alamat loopback")
		}
		if ip.IsPrivate() {
			return fmt.Errorf("URL tidak boleh mengarah ke alamat IP privat")
		}
		if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return fmt.Errorf("URL tidak boleh mengarah ke alamat link-local")
		}
		// Reject unspecified (0.0.0.0, ::)
		if ip.IsUnspecified() {
			return fmt.Errorf("URL tidak boleh mengarah ke alamat tidak valid")
		}
	}

	return nil
}

type WebhookHandler struct {
	webhookRepo    model.WebhookRepository
	webhookLogRepo model.WebhookLogRepository
	webhookService *service.WebhookService
}

func NewWebhookHandler(
	webhookRepo model.WebhookRepository,
	webhookLogRepo model.WebhookLogRepository,
	webhookService *service.WebhookService,
) *WebhookHandler {
	return &WebhookHandler{
		webhookRepo:    webhookRepo,
		webhookLogRepo: webhookLogRepo,
		webhookService: webhookService,
	}
}

func (h *WebhookHandler) RegisterRoutes(app fiber.Router, authMw, superadminMw fiber.Handler) {
	webhooks := app.Group("/admin/webhooks", authMw, superadminMw)
	webhooks.Post("/", h.Create)
	webhooks.Get("/", h.List)
	webhooks.Get("/events", h.ListEvents)
	webhooks.Put("/:id", h.Update)
	webhooks.Delete("/:id", h.Delete)
	webhooks.Get("/:id/logs", h.Logs)
	webhooks.Post("/:id/test", h.Test)
}

type createWebhookRequest struct {
	Name   string   `json:"name"`
	URL    string   `json:"url"`
	Secret *string  `json:"secret"`
	Events []string `json:"events"`
}

func (h *WebhookHandler) Create(c *fiber.Ctx) error {
	var req createWebhookRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate
	errs := map[string]string{}
	if req.Name == "" {
		errs["name"] = "Nama webhook harus diisi"
	}
	if req.URL == "" {
		errs["url"] = "URL webhook harus diisi"
	}
	if len(req.Events) == 0 {
		errs["events"] = "Minimal satu event harus dipilih"
	}
	if len(errs) > 0 {
		return response.Err(c, apperror.ValidationError(errs))
	}

	// Validate webhook URL against SSRF
	if err := validateWebhookURL(req.URL); err != nil {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"url": err.Error(),
		}))
	}

	// Validate events
	validEvents := make(map[string]bool)
	for _, e := range service.AllWebhookEvents() {
		validEvents[e] = true
	}
	for _, e := range req.Events {
		if !validEvents[e] {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"events": "Event tidak valid: " + e,
			}))
		}
	}

	// Auto-generate secret if not provided
	if req.Secret == nil || *req.Secret == "" {
		secretBytes := make([]byte, 32)
		_, _ = rand.Read(secretBytes)
		s := hex.EncodeToString(secretBytes)
		req.Secret = &s
	}

	userID := middleware.GetUserID(c)
	webhook := &model.Webhook{
		ID:           uuid.New(),
		Name:         req.Name,
		URL:          req.URL,
		Secret:       req.Secret,
		Events:       req.Events,
		IsActive:     true,
		CreatedBy:    &userID,
		FailureCount: 0,
		CreatedAt:    time.Now(),
	}

	if err := h.webhookRepo.Create(c.Context(), webhook); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "create webhook"))
	}

	return response.Created(c, webhook)
}

func (h *WebhookHandler) List(c *fiber.Ctx) error {
	webhooks, err := h.webhookRepo.FindAll(c.Context())
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list webhooks"))
	}

	if webhooks == nil {
		webhooks = []*model.Webhook{}
	}

	return response.OK(c, webhooks)
}

func (h *WebhookHandler) ListEvents(c *fiber.Ctx) error {
	return response.OK(c, service.AllWebhookEvents())
}

type updateWebhookRequest struct {
	Name     *string  `json:"name"`
	URL      *string  `json:"url"`
	Secret   *string  `json:"secret"`
	Events   []string `json:"events"`
	IsActive *bool    `json:"is_active"`
}

func (h *WebhookHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.webhookRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "find webhook"))
	}
	if existing == nil {
		return response.HandleError(c, apperror.NotFound("WEBHOOK"))
	}

	var req updateWebhookRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.URL != nil {
		if err := validateWebhookURL(*req.URL); err != nil {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"url": err.Error(),
			}))
		}
		existing.URL = *req.URL
	}
	if req.Secret != nil {
		existing.Secret = req.Secret
	}
	if req.Events != nil && len(req.Events) > 0 {
		// Validate events
		validEvents := make(map[string]bool)
		for _, e := range service.AllWebhookEvents() {
			validEvents[e] = true
		}
		for _, e := range req.Events {
			if !validEvents[e] {
				return response.Err(c, apperror.ValidationError(map[string]string{
					"events": "Event tidak valid: " + e,
				}))
			}
		}
		existing.Events = req.Events
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	if err := h.webhookRepo.Update(c.Context(), existing); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update webhook"))
	}

	return response.OK(c, existing)
}

func (h *WebhookHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.webhookRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "find webhook"))
	}
	if existing == nil {
		return response.HandleError(c, apperror.NotFound("WEBHOOK"))
	}

	if err := h.webhookRepo.Delete(c.Context(), id); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "delete webhook"))
	}

	return response.NoContent(c)
}

func (h *WebhookHandler) Logs(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.webhookRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "find webhook"))
	}
	if existing == nil {
		return response.HandleError(c, apperror.NotFound("WEBHOOK"))
	}

	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	logs, err := h.webhookLogRepo.FindByWebhook(c.Context(), id, limit)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "get webhook logs"))
	}

	if logs == nil {
		logs = []*model.WebhookLog{}
	}

	return response.OK(c, logs)
}

func (h *WebhookHandler) Test(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if err := h.webhookService.SendTestPayload(c.Context(), id); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "send test webhook"))
	}

	return response.OK(c, fiber.Map{"message": "Test webhook terkirim"})
}
