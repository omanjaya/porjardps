package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Mock AuthService
// ---------------------------------------------------------------------------

type mockAuthService struct {
	registerFn      func(ctx context.Context, email, password, fullName, phone string) (*model.User, error)
	loginFn         func(ctx context.Context, email, password string) (string, string, *model.User, error)
	refreshTokenFn  func(ctx context.Context, refreshToken string) (string, string, error)
	logoutFn        func(ctx context.Context, refreshToken string, accessToken string) error
	getProfileFn    func(ctx context.Context, userID uuid.UUID) (*model.User, error)
	updateProfileFn func(ctx context.Context, userID uuid.UUID, fullName, phone, avatarURL string) (*model.User, error)
	accessExpiry    time.Duration
}

func (m *mockAuthService) Register(ctx context.Context, email, password, fullName, phone string) (*model.User, error) {
	return m.registerFn(ctx, email, password, fullName, phone)
}
func (m *mockAuthService) Login(ctx context.Context, email, password string) (string, string, *model.User, error) {
	return m.loginFn(ctx, email, password)
}
func (m *mockAuthService) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	return m.refreshTokenFn(ctx, refreshToken)
}
func (m *mockAuthService) Logout(ctx context.Context, refreshToken string, accessToken string) error {
	return m.logoutFn(ctx, refreshToken, accessToken)
}
func (m *mockAuthService) RecordConsent(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string) {
}
func (m *mockAuthService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	return m.getProfileFn(ctx, userID)
}
func (m *mockAuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, fullName, phone, avatarURL string) (*model.User, error) {
	return m.updateProfileFn(ctx, userID, fullName, phone, avatarURL)
}
func (m *mockAuthService) AccessExpiry() time.Duration {
	return m.accessExpiry
}
func (m *mockAuthService) ForgotPassword(ctx context.Context, email string) error {
	return nil
}
func (m *mockAuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	return nil
}
func (m *mockAuthService) ChangePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testJWTSecret = "test-secret-key-for-testing-only"

func newTestUser() *model.User {
	return &model.User{
		ID:        uuid.New(),
		Email:     "test@example.com",
		FullName:  "Test User",
		Role:      "player",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// generateTestJWT creates a valid JWT token for testing authenticated routes.
func generateTestJWT(userID uuid.UUID, role string) string {
	now := time.Now()
	claims := middleware.AuthClaims{
		UserID: userID,
		Role:   role,
		Email:  "test@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "porjar-api",
			Subject:   userID.String(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(testJWTSecret))
	return signed
}

// setupAuthApp creates a Fiber app with auth routes wired to the given mock service.
func setupAuthApp(mock *mockAuthService) *fiber.App {
	app := fiber.New()
	h := NewAuthHandlerWithInterface(mock)

	authMw := middleware.AuthMiddleware(testJWTSecret)

	app.Post("/auth/register", h.Register)
	app.Post("/auth/login", h.Login)
	app.Post("/auth/refresh", h.Refresh)
	app.Post("/auth/logout", authMw, h.Logout)
	app.Get("/auth/profile", authMw, h.GetProfile)
	app.Put("/auth/profile", authMw, h.UpdateProfile)

	return app
}

// parseBody is a small helper to read the body JSON into a map.
func parseBody(t *testing.T, body io.Reader) map[string]interface{} {
	t.Helper()
	var result map[string]interface{}
	err := json.NewDecoder(body).Decode(&result)
	require.NoError(t, err, "failed to decode response body")
	return result
}

// ---------------------------------------------------------------------------
// Register Tests
// ---------------------------------------------------------------------------

func TestRegister_Success(t *testing.T) {
	user := newTestUser()
	mock := &mockAuthService{
		registerFn: func(_ context.Context, email, password, fullName, phone string) (*model.User, error) {
			assert.Equal(t, "new@example.com", email)
			return user, nil
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"email":"new@example.com","password":"StrongP1ss","full_name":"New User","phone":""}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))
	assert.NotNil(t, result["data"])
}

func TestRegister_MissingEmail(t *testing.T) {
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	body := `{"email":"","password":"StrongP1ss","full_name":"New User"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.False(t, result["success"].(bool))
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "VALIDATION_ERROR", errBody["code"])
	details := errBody["details"].(map[string]interface{})
	assert.Contains(t, details, "email")
}

func TestRegister_WeakPassword(t *testing.T) {
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	body := `{"email":"valid@example.com","password":"weak","full_name":"New User"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	details := errBody["details"].(map[string]interface{})
	assert.Contains(t, details, "password")
}

func TestRegister_DuplicateEmail(t *testing.T) {
	mock := &mockAuthService{
		registerFn: func(_ context.Context, _, _, _, _ string) (*model.User, error) {
			return nil, apperror.Conflict("EMAIL_ALREADY_EXISTS", "Email sudah terdaftar")
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"email":"dup@example.com","password":"StrongP1ss","full_name":"Dup User"}`
	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 409, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "EMAIL_ALREADY_EXISTS", errBody["code"])
}

// ---------------------------------------------------------------------------
// Login Tests
// ---------------------------------------------------------------------------

func TestLogin_Success(t *testing.T) {
	user := newTestUser()
	mock := &mockAuthService{
		loginFn: func(_ context.Context, email, password string) (string, string, *model.User, error) {
			assert.Equal(t, "test@example.com", email)
			return "access-tok", "refresh-tok", user, nil
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"email":"test@example.com","password":"StrongP1ss"}`
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))

	data := result["data"].(map[string]interface{})
	assert.Equal(t, "access-tok", data["access_token"])
	assert.Equal(t, "refresh-tok", data["refresh_token"])
	assert.NotNil(t, data["user"])
	assert.Equal(t, float64(900), data["expires_in"]) // 15 min = 900s
}

func TestLogin_InvalidCredentials(t *testing.T) {
	mock := &mockAuthService{
		loginFn: func(_ context.Context, _, _ string) (string, string, *model.User, error) {
			return "", "", nil, apperror.ErrInvalidCredentials
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"email":"test@example.com","password":"wrong"}`
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "INVALID_CREDENTIALS", errBody["code"])
}

func TestLogin_EmptyFields(t *testing.T) {
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	body := `{"email":"","password":""}`
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "VALIDATION_ERROR", errBody["code"])
	details := errBody["details"].(map[string]interface{})
	assert.Contains(t, details, "email")
	assert.Contains(t, details, "password")
}

// ---------------------------------------------------------------------------
// GetProfile Tests
// ---------------------------------------------------------------------------

func TestGetProfile_Success(t *testing.T) {
	user := newTestUser()
	mock := &mockAuthService{
		getProfileFn: func(_ context.Context, userID uuid.UUID) (*model.User, error) {
			assert.Equal(t, user.ID, userID)
			return user, nil
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	req := httptest.NewRequest("GET", "/auth/profile", nil)
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(user.ID, "player"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))

	data := result["data"].(map[string]interface{})
	assert.Equal(t, user.Email, data["email"])
	assert.Equal(t, user.FullName, data["full_name"])
}

func TestGetProfile_WithoutToken(t *testing.T) {
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	req := httptest.NewRequest("GET", "/auth/profile", nil)
	// No Authorization header

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.False(t, result["success"].(bool))
}

func TestGetProfile_InvalidToken(t *testing.T) {
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	req := httptest.NewRequest("GET", "/auth/profile", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-here")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

// ---------------------------------------------------------------------------
// Refresh Tests
// ---------------------------------------------------------------------------

func TestRefresh_Success(t *testing.T) {
	mock := &mockAuthService{
		refreshTokenFn: func(_ context.Context, refreshToken string) (string, string, error) {
			assert.Equal(t, "old-refresh-token", refreshToken)
			return "new-access-tok", "new-refresh-tok", nil
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"refresh_token":"old-refresh-token"}`
	req := httptest.NewRequest("POST", "/auth/refresh", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))

	data := result["data"].(map[string]interface{})
	assert.Equal(t, "new-access-tok", data["access_token"])
	assert.Equal(t, "new-refresh-tok", data["refresh_token"])
	assert.Equal(t, float64(900), data["expires_in"])
}

func TestRefresh_EmptyToken(t *testing.T) {
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	body := `{"refresh_token":""}`
	req := httptest.NewRequest("POST", "/auth/refresh", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "VALIDATION_ERROR", errBody["code"])
}

func TestRefresh_InvalidToken(t *testing.T) {
	mock := &mockAuthService{
		refreshTokenFn: func(_ context.Context, _ string) (string, string, error) {
			return "", "", apperror.ErrRefreshTokenInvalid
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"refresh_token":"bad-token"}`
	req := httptest.NewRequest("POST", "/auth/refresh", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "REFRESH_TOKEN_INVALID", errBody["code"])
}

// ---------------------------------------------------------------------------
// Logout Tests
// ---------------------------------------------------------------------------

func TestLogout_Success(t *testing.T) {
	user := newTestUser()
	mock := &mockAuthService{
		logoutFn: func(_ context.Context, refreshToken string, accessToken string) error {
			assert.Equal(t, "some-refresh-token", refreshToken)
			return nil
		},
		accessExpiry: 15 * time.Minute,
	}

	app := setupAuthApp(mock)
	body := `{"refresh_token":"some-refresh-token"}`
	req := httptest.NewRequest("POST", "/auth/logout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(user.ID, "player"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 204, resp.StatusCode)
}

func TestLogout_EmptyRefreshToken(t *testing.T) {
	user := newTestUser()
	mock := &mockAuthService{accessExpiry: 15 * time.Minute}
	app := setupAuthApp(mock)

	body := `{"refresh_token":""}`
	req := httptest.NewRequest("POST", "/auth/logout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(user.ID, "player"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}
