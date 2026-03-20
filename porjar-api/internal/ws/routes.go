package ws

import (
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
	fiberws "github.com/gofiber/contrib/websocket"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// authClaims mirrors middleware.AuthClaims to avoid a circular import.
type authClaims struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

func validateWSToken(tokenStr, jwtSecret string) (*authClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &authClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	claims, ok := token.Claims.(*authClaims)
	if !ok {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

// isOriginAllowed checks if the given origin is in the allowed origins list.
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	originHost := strings.ToLower(parsed.Scheme + "://" + parsed.Host)
	for _, allowed := range allowedOrigins {
		a := strings.TrimSpace(allowed)
		if a == "*" {
			return true
		}
		parsedAllowed, err := url.Parse(a)
		if err != nil {
			if strings.EqualFold(a, originHost) {
				return true
			}
			continue
		}
		allowedHost := strings.ToLower(parsedAllowed.Scheme + "://" + parsedAllowed.Host)
		if originHost == allowedHost {
			return true
		}
	}
	return false
}

func SetupRoutes(app *fiber.App, hub *Hub, jwtSecret string, allowedOrigins string) {
	origins := strings.Split(allowedOrigins, ",")

	app.Use("/ws", func(c *fiber.Ctx) error {
		if fiberws.IsWebSocketUpgrade(c) {
			// Validate Origin header against allowed origins
			origin := c.Get("Origin")
			if origin != "" && !isOriginAllowed(origin, origins) {
				slog.Warn("ws connection rejected: origin not allowed", "origin", origin)
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"error": fiber.Map{
						"code":    "FORBIDDEN",
						"message": "Origin not allowed",
					},
				})
			}
			// Store client IP for per-IP connection limiting
			c.Locals("clientIP", c.IP())
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// /ws/live-scores — public; token is optional
	app.Get("/ws/live-scores", fiberws.New(func(c *fiberws.Conn) {
		ip := c.Locals("clientIP")
		ipStr, _ := ip.(string)
		client := NewClient(hub, c.Conn, ipStr)
		hub.register <- client

		go client.WritePump()
		client.ReadPump()
	}))

	// /ws/matches/:id — requires a valid JWT passed as ?token=<jwt>
	app.Get("/ws/matches/:id", func(c *fiber.Ctx) error {
		tokenStr := c.Query("token")
		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "UNAUTHORIZED",
					"message": "Token diperlukan untuk mengakses endpoint ini",
				},
			})
		}
		_, err := validateWSToken(tokenStr, jwtSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "TOKEN_INVALID",
					"message": "Token tidak valid atau sudah kedaluwarsa",
				},
			})
		}
		return c.Next()
	}, fiberws.New(func(c *fiberws.Conn) {
		matchID := c.Params("id")
		ip := c.Locals("clientIP")
		ipStr, _ := ip.(string)
		client := NewClient(hub, c.Conn, ipStr)
		hub.register <- client
		hub.Subscribe(client, "match:"+matchID)

		slog.Debug("ws client auto-subscribed to match", "match_id", matchID)

		go client.WritePump()
		client.ReadPump()
	}))
}
