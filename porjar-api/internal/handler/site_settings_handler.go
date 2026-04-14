package handler

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/cache"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

const siteSettingsCacheKey = "site_settings:v1"
const siteSettingsCacheTTL = 5 * time.Minute

type SiteSettingsHandler struct {
	svc   *service.SiteSettingsService
	cache *cache.Cache
}

func NewSiteSettingsHandler(svc *service.SiteSettingsService, c *cache.Cache) *SiteSettingsHandler {
	return &SiteSettingsHandler{svc: svc, cache: c}
}

func (h *SiteSettingsHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/site-settings", h.Get)
	app.Put("/admin/site-settings", authMw, adminMw, h.Update)
}

func (h *SiteSettingsHandler) Get(c *fiber.Ctx) error {
	if h.cache != nil {
		var cached model.SiteSettings
		if err := h.cache.Get(c.Context(), siteSettingsCacheKey, &cached); err == nil {
			return response.OK(c, cached)
		} else if !errors.Is(err, redis.Nil) {
			// fall through to DB on cache error
		}
	}
	settings, err := h.svc.Get(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}
	if h.cache != nil {
		_ = h.cache.Set(c.Context(), siteSettingsCacheKey, settings, siteSettingsCacheTTL)
	}
	return response.OK(c, settings)
}

type updateSiteSettingsRequest struct {
	FAQs       []model.FAQItem     `json:"faqs"`
	AboutItems []model.AboutItem   `json:"about_items"`
	Contacts   []model.ContactItem `json:"contacts"`
}

func (h *SiteSettingsHandler) Update(c *fiber.Ctx) error {
	var req updateSiteSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	settings := &model.SiteSettings{
		ID:         1,
		FAQs:       req.FAQs,
		AboutItems: req.AboutItems,
		Contacts:   req.Contacts,
	}
	result, err := h.svc.Update(c.Context(), settings)
	if err != nil {
		return response.HandleError(c, err)
	}
	if h.cache != nil {
		_ = h.cache.Delete(c.Context(), siteSettingsCacheKey)
	}
	return response.OK(c, result)
}
