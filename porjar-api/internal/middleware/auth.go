package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/redis/go-redis/v9"
)

type AuthClaims struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

const (
	LocalUserID = "user_id"
	LocalRole   = "role"
	LocalEmail  = "email"
)

// AuthMiddleware validates the Bearer JWT and populates request context with user claims.
func AuthMiddleware(jwtSecret string) fiber.Handler {
	return AuthMiddlewareWithBlacklist(jwtSecret, nil, nil)
}

// AuthMiddlewareWithBlacklist validates the Bearer JWT, checks the token blacklist in Redis
// (when rdb is non-nil), re-validates the user role against the database (cached in Redis
// for 60 seconds) to prevent privilege escalation with stale JWTs, and populates request
// context with user claims.
func AuthMiddlewareWithBlacklist(jwtSecret string, rdb *redis.Client, userRepo model.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try Authorization header first, then fall back to access_token cookie
		tokenStr := ""
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenStr = parts[1]
			}
		}
		if tokenStr == "" {
			tokenStr = c.Cookies("access_token")
		}
		if tokenStr == "" {
			return response.Err(c, apperror.ErrUnauthorized)
		}

		token, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return response.Err(c, apperror.ErrTokenInvalid)
		}

		claims, ok := token.Claims.(*AuthClaims)
		if !ok {
			return response.Err(c, apperror.ErrUnauthorized)
		}

		// Check token blacklist (populated on logout)
		if rdb != nil {
			blacklistKey := fmt.Sprintf("blacklist_at:%s", tokenStr)
			if val, _ := rdb.Get(c.UserContext(), blacklistKey).Result(); val != "" {
				return c.Status(401).JSON(fiber.Map{"error": "Token telah diinvalidasi"})
			}
		}

		// Re-validate user role against database (cached in Redis for 60s) to prevent
		// privilege escalation when a user's role has been changed but their JWT is still valid.
		role := claims.Role
		if rdb != nil && userRepo != nil {
			ctx := c.UserContext()
			cacheKey := fmt.Sprintf("user_role:%s", claims.UserID.String())

			if cached, err := rdb.Get(ctx, cacheKey).Result(); err == nil && cached != "" {
				role = cached
			} else {
				user, err := userRepo.FindByID(ctx, claims.UserID)
				if err != nil || user == nil {
					return response.Err(c, apperror.ErrUnauthorized)
				}
				role = user.Role
				rdb.Set(ctx, cacheKey, role, 60*time.Second)
			}
		}

		c.Locals(LocalUserID, claims.UserID)
		c.Locals(LocalRole, role)
		c.Locals(LocalEmail, claims.Email)

		return c.Next()
	}
}

func RoleMiddleware(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals(LocalRole).(string)
		if !ok {
			return response.Err(c, apperror.ErrUnauthorized)
		}

		for _, role := range roles {
			if userRole == role {
				return c.Next()
			}
		}

		return response.Err(c, apperror.ErrForbidden)
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *fiber.Ctx) uuid.UUID {
	id, _ := c.Locals(LocalUserID).(uuid.UUID)
	return id
}

// GetUserRole extracts user role from context
func GetUserRole(c *fiber.Ctx) string {
	role, _ := c.Locals(LocalRole).(string)
	return role
}

// OptionalAuthMiddleware extracts user info from JWT if present, but does not block unauthenticated requests.
func OptionalAuthMiddleware(jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try Authorization header first, then fall back to access_token cookie
		tokenStr := ""
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenStr = parts[1]
			}
		}
		if tokenStr == "" {
			tokenStr = c.Cookies("access_token")
		}
		if tokenStr == "" {
			return c.Next()
		}

		token, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return c.Next()
		}

		claims, ok := token.Claims.(*AuthClaims)
		if !ok {
			return c.Next()
		}

		c.Locals(LocalUserID, claims.UserID)
		c.Locals(LocalRole, claims.Role)
		c.Locals(LocalEmail, claims.Email)

		return c.Next()
	}
}
