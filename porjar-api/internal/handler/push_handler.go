package handler

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// PushHandler manages browser push notification subscriptions.
type PushHandler struct {
	subRepo         model.PushSubscriptionRepository
	vapidPublicKey  string
	vapidPrivateKey string
	vapidSubject    string
}

func NewPushHandler(subRepo model.PushSubscriptionRepository, vapidPublicKey, vapidPrivateKey, vapidSubject string) *PushHandler {
	return &PushHandler{
		subRepo:         subRepo,
		vapidPublicKey:  vapidPublicKey,
		vapidPrivateKey: vapidPrivateKey,
		vapidSubject:    vapidSubject,
	}
}

func (h *PushHandler) RegisterRoutes(app fiber.Router, authMw fiber.Handler) {
	app.Get("/push/vapid-public-key", h.GetVAPIDPublicKey)
	// Subscribe/unsubscribe are public — auth is optional (user_id captured if logged in)
	app.Post("/push/subscribe", h.Subscribe)
	app.Delete("/push/subscribe", h.Unsubscribe)
}

func (h *PushHandler) GetVAPIDPublicKey(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"public_key": h.vapidPublicKey})
}

type subscribeRequest struct {
	Endpoint       string `json:"endpoint"`
	ExpirationTime *int64 `json:"expirationTime"`
	Keys           struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func (h *PushHandler) Subscribe(c *fiber.Ctx) error {
	var req subscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"endpoint": "Endpoint, p256dh dan auth wajib diisi",
		}))
	}
	// Capture user_id if logged in (optional — public users subscribe without auth)
	var userIDPtr *uuid.UUID
	if uid := middleware.GetUserID(c); uid != uuid.Nil {
		userIDPtr = &uid
	}
	sub := &model.PushSubscription{
		ID:       uuid.New(),
		UserID:   userIDPtr,
		Endpoint: req.Endpoint,
		P256dh:   req.Keys.P256dh,
		Auth:     req.Keys.Auth,
	}
	if err := h.subRepo.Upsert(c.Context(), sub); err != nil {
		slog.Error("failed to save push subscription", "error", err)
		return response.Err(c, apperror.ErrInternal)
	}
	return response.OK(c, fiber.Map{"message": "Berhasil subscribe notifikasi"})
}

type unsubscribeRequest struct {
	Endpoint string `json:"endpoint"`
}

func (h *PushHandler) Unsubscribe(c *fiber.Ctx) error {
	var req unsubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.Endpoint == "" {
		return response.BadRequest(c, "Endpoint wajib diisi")
	}
	if err := h.subRepo.DeleteByEndpoint(c.Context(), req.Endpoint); err != nil {
		slog.Error("failed to delete push subscription", "error", err)
		return response.Err(c, apperror.ErrInternal)
	}
	return response.NoContent(c)
}

// SendPushToAll sends a push notification to all subscribed users. Safe to call from goroutine.
func (h *PushHandler) SendPushToAll(ctx context.Context, title, body, url string) {
	if h.vapidPrivateKey == "" || h.vapidPublicKey == "" {
		return
	}
	subs, err := h.subRepo.FindAll(ctx)
	if err != nil {
		slog.Error("push SendPushToAll: failed to find subscriptions", "error", err)
		return
	}
	payload, err := json.Marshal(map[string]string{
		"title": title,
		"body":  body,
		"url":   url,
	})
	if err != nil {
		slog.Error("push: failed to marshal payload", "error", err)
		return
	}
	for _, sub := range subs {
		s := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}
		resp, err := webpush.SendNotification(payload, s, &webpush.Options{
			VAPIDPublicKey:  h.vapidPublicKey,
			VAPIDPrivateKey: h.vapidPrivateKey,
			Subscriber:      h.vapidSubject,
			TTL:             30,
		})
		if resp != nil {
			defer resp.Body.Close()
		}
		if err != nil {
			slog.Error("push: failed to send notification", "endpoint", sub.Endpoint[:min(20, len(sub.Endpoint))], "error", err)
			continue
		}
		if resp.StatusCode == 410 || resp.StatusCode == 404 {
			// Subscription expired or gone — clean up
			_ = h.subRepo.DeleteByEndpoint(ctx, sub.Endpoint)
		}
	}
}
