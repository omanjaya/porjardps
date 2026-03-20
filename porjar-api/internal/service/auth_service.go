package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"log/slog"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthConfig struct {
	JWTSecret        string
	AccessExpiry     time.Duration
	RefreshExpiry    time.Duration
}

type AuthService struct {
	userRepo    model.UserRepository
	consentRepo model.ConsentRepository
	redis       *redis.Client
	config      AuthConfig
}

func NewAuthService(userRepo model.UserRepository, redisClient *redis.Client, cfg AuthConfig) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		redis:    redisClient,
		config:   cfg,
	}
}

// SetConsentRepo injects the consent repository (optional; if not set, consent recording is skipped).
func (s *AuthService) SetConsentRepo(repo model.ConsentRepository) {
	s.consentRepo = repo
}

func (s *AuthService) Register(ctx context.Context, email, password, fullName, phone string) (*model.User, error) {
	existing, _ := s.userRepo.FindByEmail(ctx, email)
	if existing != nil {
		return nil, apperror.Conflict("EMAIL_ALREADY_EXISTS", "Email sudah terdaftar")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.ErrInternal
	}

	user := &model.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		FullName:     fullName,
		Role:         "player",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if phone != "" {
		user.Phone = &phone
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, apperror.ErrInternal
	}

	return user, nil
}

// RecordConsent persists a 'personal_data' consent record for the given user (UU PDP Pasal 7).
// If no consent repository is configured, the call is a no-op.
func (s *AuthService) RecordConsent(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string) {
	if s.consentRepo == nil {
		return
	}
	c := &model.UserConsent{
		ID:          uuid.New(),
		UserID:      userID,
		ConsentType: "personal_data",
		Version:     "1.0",
		GivenAt:     time.Now(),
	}
	if ipAddress != "" {
		c.IPAddress = &ipAddress
	}
	if userAgent != "" {
		c.UserAgent = &userAgent
	}
	// Best-effort — do not block registration on consent persistence failure.
	if err := s.consentRepo.Record(ctx, c); err != nil {
		slog.Warn("failed to record user consent", "user_id", userID, "error", err)
	}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, string, *model.User, error) {
	// Per-email rate limiting: max 10 failed attempts per 15 minutes
	rateLimitKey := fmt.Sprintf("login_email:%s", strings.ToLower(email))
	attempts, _ := s.redis.Get(ctx, rateLimitKey).Int()
	if attempts >= 10 {
		return "", "", nil, apperror.New("TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.", 429)
	}

	var user *model.User
	var err error

	// If input doesn't contain "@", treat as NISN login
	if !strings.Contains(email, "@") {
		user, err = s.userRepo.FindByNISN(ctx, email)
	} else {
		user, err = s.userRepo.FindByEmail(ctx, email)
	}
	if err != nil || user == nil {
		// Increment failed attempt counter
		s.redis.Incr(ctx, rateLimitKey)
		s.redis.Expire(ctx, rateLimitKey, 15*time.Minute)
		return "", "", nil, apperror.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		// Increment failed attempt counter
		s.redis.Incr(ctx, rateLimitKey)
		s.redis.Expire(ctx, rateLimitKey, 15*time.Minute)
		return "", "", nil, apperror.ErrInvalidCredentials
	}

	// Reset rate limit counter on successful login
	s.redis.Del(ctx, rateLimitKey)

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return "", "", nil, apperror.ErrInternal
	}

	refreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return "", "", nil, apperror.ErrInternal
	}

	return accessToken, refreshToken, user, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	key := fmt.Sprintf("refresh_token:%s", refreshToken)

	userIDStr, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return "", "", apperror.ErrRefreshTokenInvalid
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", "", apperror.ErrRefreshTokenInvalid
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return "", "", apperror.ErrRefreshTokenInvalid
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return "", "", apperror.ErrInternal
	}

	// Rotate: generate new refresh token BEFORE deleting the old one
	// so the user isn't locked out if generation fails
	newRefreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return "", "", apperror.ErrInternal
	}

	// Delete old refresh token only after new tokens are successfully generated
	s.redis.Del(ctx, key)

	return accessToken, newRefreshToken, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string, accessToken string) error {
	key := fmt.Sprintf("refresh_token:%s", refreshToken)
	s.redis.Del(ctx, key)

	// Blacklist the access token until it would naturally expire
	if accessToken != "" {
		blacklistKey := fmt.Sprintf("blacklist_at:%s", accessToken)
		s.redis.Set(ctx, blacklistKey, "1", s.config.AccessExpiry+time.Minute)
	}
	return nil
}

func (s *AuthService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, apperror.NotFound("user")
	}
	return user, nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, fullName, phone, avatarURL string) (*model.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, apperror.NotFound("user")
	}

	user.FullName = fullName
	user.UpdatedAt = time.Now()

	if phone != "" {
		user.Phone = &phone
	} else {
		user.Phone = nil
	}

	if avatarURL != "" {
		user.AvatarURL = &avatarURL
	} else {
		user.AvatarURL = nil
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, apperror.ErrInternal
	}

	return user, nil
}

// ChangePassword verifies old password, hashes new, updates, and clears needs_password_change.
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return apperror.NotFound("user")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return apperror.New("INVALID_OLD_PASSWORD", "Password lama salah", 400)
	}

	if !validator.ValidatePassword(newPassword) {
		return apperror.ValidationError(map[string]string{
			"new_password": "Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka",
		})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.ErrInternal
	}

	if err := s.userRepo.UpdatePassword(ctx, userID, string(hash)); err != nil {
		return apperror.ErrInternal
	}

	return nil
}

func (s *AuthService) generateAccessToken(user *model.User) (string, error) {
	now := time.Now()
	claims := middleware.AuthClaims{
		UserID: user.ID,
		Role:   user.Role,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "porjar-api",
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWTSecret))
}

func (s *AuthService) generateRefreshToken(ctx context.Context, userID uuid.UUID) (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	token := hex.EncodeToString(bytes)
	key := fmt.Sprintf("refresh_token:%s", token)

	if err := s.redis.Set(ctx, key, userID.String(), s.config.RefreshExpiry).Err(); err != nil {
		return "", err
	}

	return token, nil
}

// AccessExpiry returns the access token expiry duration (used by handler for expires_in).
func (s *AuthService) AccessExpiry() time.Duration {
	return s.config.AccessExpiry
}

// RefreshExpiry returns the refresh token expiry duration (used by handler for cookie max-age).
func (s *AuthService) RefreshExpiry() time.Duration {
	return s.config.RefreshExpiry
}

// ForgotPassword generates a reset token for the given email.
// Always returns nil so we don't reveal whether the email exists.
// Performs the same operations regardless of whether the email exists
// to prevent timing-based user enumeration.
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	user, _ := s.userRepo.FindByEmail(ctx, email)

	// Always generate a token and store in Redis, regardless of whether
	// the user exists. This ensures both paths take the same time,
	// preventing timing-based email enumeration attacks.
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil
	}
	token := hex.EncodeToString(tokenBytes)

	// Store in Redis with 1 hour TTL
	key := fmt.Sprintf("reset_token:%s", token)
	if user != nil {
		// Real user: store their ID so the token is usable
		_ = s.redis.Set(ctx, key, user.ID.String(), time.Hour).Err()
		slog.Info("password reset requested", "email", email)
	} else {
		// Non-existing user: store a dummy value (token will never be used)
		_ = s.redis.Set(ctx, key, "invalid", time.Hour).Err()
	}

	return nil
}

// ResetPassword validates the reset token and updates the user's password.
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	key := fmt.Sprintf("reset_token:%s", token)

	userIDStr, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return apperror.New("RESET_TOKEN_INVALID", "Token reset tidak valid atau sudah kedaluwarsa", 400)
	}

	// Validate password strength
	if !validator.ValidatePassword(newPassword) {
		return apperror.ValidationError(map[string]string{
			"new_password": "Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return apperror.New("RESET_TOKEN_INVALID", "Token reset tidak valid atau sudah kedaluwarsa", 400)
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return apperror.New("RESET_TOKEN_INVALID", "Token reset tidak valid atau sudah kedaluwarsa", 400)
	}

	// Delete the token from Redis BEFORE updating password so it can't be reused if the update fails
	s.redis.Del(ctx, key)

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.ErrInternal
	}

	user.PasswordHash = string(hash)
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return apperror.ErrInternal
	}

	return nil
}
