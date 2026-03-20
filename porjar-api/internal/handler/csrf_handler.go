package handler

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// CSRFHandler provides a public endpoint for the frontend to obtain a CSRF token.
type CSRFHandler struct{}

func NewCSRFHandler() *CSRFHandler {
	return &CSRFHandler{}
}

// GetToken generates a CSRF token, sets it as a non-HttpOnly cookie, and returns
// it in the JSON body so the frontend can store it for the X-CSRF-Token header.
func (h *CSRFHandler) GetToken(c *fiber.Ctx) error {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "CSRF_GENERATION_FAILED",
				"message": "Gagal membuat CSRF token",
			},
		})
	}
	tokenStr := hex.EncodeToString(token)

	c.Cookie(&fiber.Cookie{
		Name:     "porjar_csrf",
		Value:    tokenStr,
		Path:     "/",
		MaxAge:   86400,
		Secure:   true,
		HTTPOnly: false, // Must be readable by JS
		SameSite: "Strict",
	})

	return response.OK(c, fiber.Map{"csrf_token": tokenStr})
}
