package handler

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/porjar-denpasar/porjar-api/internal/service"
	"github.com/redis/go-redis/v9"
)

// AuthServiceInterface defines the methods the auth handler needs from the service layer.
type AuthServiceInterface interface {
	Register(ctx context.Context, email, password, fullName, phone string) (*model.User, error)
	Login(ctx context.Context, email, password, clientIP string) (string, string, *model.User, error)
	RefreshToken(ctx context.Context, refreshToken string) (string, string, error)
	Logout(ctx context.Context, refreshToken string, accessToken string) error
	GetProfile(ctx context.Context, userID uuid.UUID) (*model.User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, fullName, phone, avatarURL string) (*model.User, error)
	AccessExpiry() time.Duration
	RefreshExpiry() time.Duration
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, newPassword string) error
	ChangePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error
	RecordConsent(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string)
}

type AuthHandler struct {
	authService  AuthServiceInterface
	secureCookie bool // true in production (HTTPS), false in dev (HTTP)
	redis        *redis.Client
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService, secureCookie: false}
}

// NewAuthHandlerSecure creates an AuthHandler with secure cookie flag for production.
func NewAuthHandlerSecure(authService *service.AuthService, secure bool) *AuthHandler {
	return &AuthHandler{authService: authService, secureCookie: secure}
}

// NewAuthHandlerWithRedis creates an AuthHandler with Redis for in-handler rate limiting.
func NewAuthHandlerWithRedis(authService *service.AuthService, secure bool, rdb *redis.Client) *AuthHandler {
	return &AuthHandler{authService: authService, secureCookie: secure, redis: rdb}
}

// NewAuthHandlerWithInterface creates an AuthHandler with any AuthServiceInterface implementation.
func NewAuthHandlerWithInterface(authService AuthServiceInterface) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// setAuthCookies sets HttpOnly cookies for both access and refresh tokens.
func (h *AuthHandler) setAuthCookies(c *fiber.Ctx, accessToken, refreshToken string) {
	accessMaxAge := int(h.authService.AccessExpiry().Seconds())
	refreshMaxAge := int(h.authService.RefreshExpiry().Seconds())

	// Access token cookie: HttpOnly, SameSite=Lax (needed for navigational requests)
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   accessMaxAge,
		HTTPOnly: true,
		Secure:   h.secureCookie,
		SameSite: "Lax",
	})

	// Refresh token cookie: HttpOnly, SameSite=Strict (only sent on same-site requests)
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/api/v1/auth", // scoped to auth endpoints only
		MaxAge:   refreshMaxAge,
		HTTPOnly: true,
		Secure:   h.secureCookie,
		SameSite: "Strict",
	})
}

// clearAuthCookies removes auth cookies by setting MaxAge=-1.
func (h *AuthHandler) clearAuthCookies(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		Secure:   h.secureCookie,
		SameSite: "Lax",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/v1/auth",
		MaxAge:   -1,
		HTTPOnly: true,
		Secure:   h.secureCookie,
		SameSite: "Strict",
	})
}

type registerRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	FullName     string `json:"full_name"`
	Phone        string `json:"phone"`
	ConsentGiven bool   `json:"consent_given"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type updateProfileRequest struct {
	FullName  string `json:"full_name"`
	Phone     string `json:"phone"`
	AvatarURL string `json:"avatar_url"`
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.FullName = validator.TrimString(req.FullName)
	req.Phone = validator.TrimString(req.Phone)

	errors := make(map[string]string)

	if !validator.ValidateEmail(req.Email) {
		errors["email"] = "Format email tidak valid"
	}
	if !validator.ValidatePassword(req.Password) {
		errors["password"] = "Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka"
	}
	if !validator.ValidateStringLength(req.FullName, 2, 100) {
		errors["full_name"] = "Nama lengkap harus 2-100 karakter"
	}
	if req.Phone != "" && !validator.ValidatePhone(req.Phone) {
		errors["phone"] = "Format nomor telepon tidak valid"
	}
	if !req.ConsentGiven {
		errors["consent_given"] = "Persetujuan penggunaan data diperlukan untuk mendaftar"
	}

	if len(errors) > 0 {
		return response.Err(c, apperror.ValidationError(errors))
	}

	user, err := h.authService.Register(c.Context(), req.Email, req.Password, req.FullName, req.Phone)
	if err != nil {
		return response.HandleError(c, err)
	}

	slog.Info("user registered",
		"user_id", user.ID,
		"email", user.Email,
		"operation", "register",
	)

	// Record UU PDP consent after successful registration (best-effort, non-blocking)
	userAgent := strings.ReplaceAll(string(c.Request().Header.UserAgent()), "\n", " ")
	userAgent = strings.ReplaceAll(userAgent, "\r", " ")
	h.authService.RecordConsent(c.Context(), user.ID, c.IP(), userAgent)

	return response.Created(c, user.ToProfile())
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Normalize: trim whitespace and lowercase (only for email addresses; NISN inputs are digits)
	req.Email = strings.TrimSpace(req.Email)
	if strings.Contains(req.Email, "@") {
		req.Email = strings.ToLower(req.Email)
	}

	errors := make(map[string]string)

	if req.Email == "" {
		errors["email"] = "Email atau NIK wajib diisi"
	}
	if req.Password == "" {
		errors["password"] = "Password wajib diisi"
	}

	if len(errors) > 0 {
		return response.Err(c, apperror.ValidationError(errors))
	}

	accessToken, refreshToken, user, err := h.authService.Login(c.Context(), req.Email, req.Password, c.IP())
	if err != nil {
		return response.HandleError(c, err)
	}

	slog.Info("user logged in",
		"user_id", user.ID,
		"role", user.Role,
		"operation", "login",
	)

	// Set HttpOnly cookies for web clients
	h.setAuthCookies(c, accessToken, refreshToken)

	// Still return tokens in JSON body for backward compatibility (mobile apps, API clients)
	return response.OK(c, fiber.Map{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"expires_in":    int(h.authService.AccessExpiry().Seconds()),
		"user":          user.ToProfile(),
	})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req refreshRequest
	// Ignore parse errors — body may be empty when using cookie-based refresh
	_ = c.BodyParser(&req)

	// Fallback: read refresh_token from HttpOnly cookie if not in request body
	if req.RefreshToken == "" {
		req.RefreshToken = c.Cookies("refresh_token")
	}

	if req.RefreshToken == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"refresh_token": "Refresh token wajib diisi",
		}))
	}

	accessToken, newRefreshToken, err := h.authService.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		// Clear stale cookies on refresh failure
		h.clearAuthCookies(c)
		return response.HandleError(c, err)
	}

	// Set new HttpOnly cookies
	h.setAuthCookies(c, accessToken, newRefreshToken)

	return response.OK(c, fiber.Map{
		"access_token":  accessToken,
		"refresh_token": newRefreshToken,
		"expires_in":    int(h.authService.AccessExpiry().Seconds()),
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req logoutRequest
	// Ignore parse errors — body may be empty when using cookie-based auth
	_ = c.BodyParser(&req)

	// Fallback: read refresh_token from HttpOnly cookie if not in request body
	if req.RefreshToken == "" {
		req.RefreshToken = c.Cookies("refresh_token")
	}

	if req.RefreshToken == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"refresh_token": "Refresh token wajib diisi",
		}))
	}

	// Extract access token from Authorization header or cookie for blacklisting
	var accessToken string
	authHeader := c.Get("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		accessToken = authHeader[7:]
	} else {
		accessToken = c.Cookies("access_token")
	}

	if err := h.authService.Logout(c.Context(), req.RefreshToken, accessToken); err != nil {
		return response.HandleError(c, err)
	}

	// Clear HttpOnly cookies
	h.clearAuthCookies(c)

	return response.NoContent(c)
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	user, err := h.authService.GetProfile(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, user.ToProfile())
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	req.FullName = validator.TrimString(req.FullName)
	req.Phone = validator.TrimString(req.Phone)
	req.AvatarURL = validator.TrimString(req.AvatarURL)

	errors := make(map[string]string)

	if !validator.ValidateStringLength(req.FullName, 2, 100) {
		errors["full_name"] = "Nama lengkap harus 2-100 karakter"
	}
	if req.Phone != "" && !validator.ValidatePhone(req.Phone) {
		errors["phone"] = "Format nomor telepon tidak valid"
	}

	if len(errors) > 0 {
		return response.Err(c, apperror.ValidationError(errors))
	}

	user, err := h.authService.UpdateProfile(c.Context(), userID, req.FullName, req.Phone, req.AvatarURL)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, user.ToProfile())
}

// checkRedisRateLimit increments a Redis counter for the given key and returns true (rate limited)
// when the count exceeds maxAttempts within the window. If Redis is unavailable it fails open.
func (h *AuthHandler) checkRedisRateLimit(c *fiber.Ctx, key string, maxAttempts int, window time.Duration) bool {
	if h.redis == nil {
		return false
	}
	ctx := c.Context()
	pipe := h.redis.Pipeline()
	incrCmd := pipe.Incr(ctx, key)
	pipe.ExpireNX(ctx, key, window)
	if _, err := pipe.Exec(ctx); err != nil {
		return false // fail open when Redis is unavailable
	}
	return incrCmd.Val() > int64(maxAttempts)
}

func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	req.Email = validator.TrimString(req.Email)

	if req.Email == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"email": "Email wajib diisi",
		}))
	}

	// Always return 200 regardless of whether email exists
	_ = h.authService.ForgotPassword(c.Context(), req.Email)

	return response.OK(c, fiber.Map{
		"message": "Jika email terdaftar, link reset password telah dikirim",
	})
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	req.Token = validator.TrimString(req.Token)

	errors := make(map[string]string)

	if req.Token == "" {
		errors["token"] = "Token wajib diisi"
	}
	if req.NewPassword == "" {
		errors["new_password"] = "Password baru wajib diisi"
	} else if !validator.ValidatePassword(req.NewPassword) {
		errors["new_password"] = "Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka"
	}

	if len(errors) > 0 {
		return response.Err(c, apperror.ValidationError(errors))
	}

	// Rate limit: 5 attempts per token per 15 minutes
	if req.Token != "" {
		rlKey := fmt.Sprintf("rl:reset_pw:%s", req.Token)
		if h.checkRedisRateLimit(c, rlKey, 5, 15*time.Minute) {
			return response.Err(c, apperror.New("TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan reset password. Coba lagi nanti.", 429))
		}
	}

	if err := h.authService.ResetPassword(c.Context(), req.Token, req.NewPassword); err != nil {
		return response.HandleError(c, err)
	}

	slog.Info("password reset completed", "operation", "reset_password")

	return response.OK(c, fiber.Map{
		"message": "Password berhasil direset",
	})
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Rate limit: 10 attempts per userID per 15 minutes
	rlKey := fmt.Sprintf("rl:change_pw:%s", userID.String())
	if h.checkRedisRateLimit(c, rlKey, 10, 15*time.Minute) {
		return response.Err(c, apperror.New("TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan ganti password. Coba lagi nanti.", 429))
	}

	var req changePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	errors := make(map[string]string)

	if req.OldPassword == "" {
		errors["old_password"] = "Password lama wajib diisi"
	}
	if req.NewPassword == "" {
		errors["new_password"] = "Password baru wajib diisi"
	}

	if len(errors) > 0 {
		return response.Err(c, apperror.ValidationError(errors))
	}

	if err := h.authService.ChangePassword(c.Context(), userID, req.OldPassword, req.NewPassword); err != nil {
		return response.HandleError(c, err)
	}

	slog.Info("password changed", "user_id", userID, "operation", "change_password")

	return response.OK(c, fiber.Map{
		"message": "Password berhasil diubah",
	})
}
