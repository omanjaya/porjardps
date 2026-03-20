package handler

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

// AuthServiceInterface defines the methods the auth handler needs from the service layer.
type AuthServiceInterface interface {
	Register(ctx context.Context, email, password, fullName, phone string) (*model.User, error)
	Login(ctx context.Context, email, password string) (string, string, *model.User, error)
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
	authService AuthServiceInterface
	secureCookie bool // true in production (HTTPS), false in dev (HTTP)
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService, secureCookie: false}
}

// NewAuthHandlerSecure creates an AuthHandler with secure cookie flag for production.
func NewAuthHandlerSecure(authService *service.AuthService, secure bool) *AuthHandler {
	return &AuthHandler{authService: authService, secureCookie: secure}
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

	req.Email = validator.TrimString(req.Email)
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

	// Record UU PDP consent after successful registration (best-effort, non-blocking)
	h.authService.RecordConsent(c.Context(), user.ID, c.IP(), string(c.Request().Header.UserAgent()))

	return response.Created(c, user.ToProfile())
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	req.Email = validator.TrimString(req.Email)

	errors := make(map[string]string)

	if req.Email == "" {
		errors["email"] = "Email atau NISN wajib diisi"
	}
	if req.Password == "" {
		errors["password"] = "Password wajib diisi"
	}

	if len(errors) > 0 {
		return response.Err(c, apperror.ValidationError(errors))
	}

	accessToken, refreshToken, user, err := h.authService.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return response.HandleError(c, err)
	}

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

	if err := h.authService.ResetPassword(c.Context(), req.Token, req.NewPassword); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{
		"message": "Password berhasil direset",
	})
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

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

	return response.OK(c, fiber.Map{
		"message": "Password berhasil diubah",
	})
}
