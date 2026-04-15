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
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
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
	userRepo     model.UserRepository
	consentRepo  model.ConsentRepository
	badgeService *BadgeService
	emailService *EmailService
	redis        *redis.Client
	config       AuthConfig
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

// SetBadgeService injects the badge service for fire-and-forget badge awards.
func (s *AuthService) SetBadgeService(bs *BadgeService) {
	s.badgeService = bs
}

// SetEmailService injects the email service for verification/reset emails.
// When unset (or the service reports Enabled=false), registrations are
// auto-verified so local/test environments without SMTP still work.
func (s *AuthService) SetEmailService(es *EmailService) {
	s.emailService = es
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
		Role:         model.RolePlayer,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if phone != "" {
		user.Phone = &phone
	}

	// Email verification: if SMTP is configured, generate a 24h token and send
	// a verification email. Otherwise auto-verify so local/dev flows continue
	// to work without SMTP.
	smtpEnabled := s.emailService != nil && s.emailService.Enabled()
	var verificationToken string
	if smtpEnabled {
		tokenBytes := make([]byte, 32)
		if _, err := rand.Read(tokenBytes); err != nil {
			return nil, apperror.ErrInternal
		}
		verificationToken = hex.EncodeToString(tokenBytes)
		expiresAt := time.Now().Add(24 * time.Hour)
		user.EmailVerificationToken = &verificationToken
		user.EmailVerificationTokenExpiresAt = &expiresAt
	} else {
		now := time.Now()
		user.EmailVerifiedAt = &now
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, apperror.ErrInternal
	}

	audit.Log(ctx, audit.Entry{
		UserID:     &user.ID,
		Action:     "user_registered",
		EntityType: "user",
		EntityID:   &user.ID,
		Details:    map[string]interface{}{"email": email, "full_name": fullName},
	})

	// Fire-and-forget: send verification email (best effort)
	if smtpEnabled && verificationToken != "" {
		go func(to, name, token string) {
			// Use a detached background context: the caller's context may already
			// be cancelled by the time the goroutine runs.
			if err := s.emailService.SendVerification(context.Background(), to, name, token); err != nil {
				slog.Warn("failed to send verification email", "email", to, "error", err)
			}
		}(user.Email, user.FullName, verificationToken)
	}

	// Fire-and-forget: award "first-login" badge
	if s.badgeService != nil {
		go s.badgeService.AwardIfEligible(ctx, user.ID, "first-login")
	}

	return user, nil
}

// VerifyEmail consumes the given verification token, marking the user's email
// as verified. Returns a 400-style error when the token is unknown or expired.
func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	if token == "" {
		return apperror.New("VERIFICATION_TOKEN_INVALID", "Token verifikasi tidak valid", 400)
	}

	user, err := s.userRepo.FindByEmailVerificationToken(ctx, token)
	if err != nil || user == nil {
		return apperror.New("VERIFICATION_TOKEN_INVALID", "Link verifikasi tidak valid atau sudah kadaluarsa", 400)
	}

	// Already verified: treat as a successful no-op so retries from the UI
	// (double-click, React StrictMode) don't surface as errors.
	if user.EmailVerifiedAt != nil {
		return nil
	}

	if user.EmailVerificationTokenExpiresAt != nil && time.Now().After(*user.EmailVerificationTokenExpiresAt) {
		return apperror.New("VERIFICATION_TOKEN_INVALID", "Link verifikasi tidak valid atau sudah kadaluarsa", 400)
	}

	if err := s.userRepo.ConsumeEmailVerificationToken(ctx, user.ID); err != nil {
		return apperror.ErrInternal
	}

	audit.Log(ctx, audit.Entry{
		UserID:     &user.ID,
		Action:     "email_verified",
		EntityType: "user",
		EntityID:   &user.ID,
	})

	return nil
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

func (s *AuthService) Login(ctx context.Context, email, password, clientIP string) (string, string, *model.User, error) {
	// Per-email rate limiting: max 10 failed attempts per 15 minutes
	rateLimitKey := fmt.Sprintf("login_email:%s", strings.ToLower(email))
	attempts, _ := s.redis.Get(ctx, rateLimitKey).Int()
	if attempts >= 10 {
		return "", "", nil, apperror.New("TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.", 429)
	}

	// Per-IP rate limiting: max 20 attempts per IP per 15 minutes (across all emails)
	if clientIP != "" {
		ipRateLimitKey := fmt.Sprintf("login_ip:%s", clientIP)
		ipAttempts, _ := s.redis.Get(ctx, ipRateLimitKey).Int()
		if ipAttempts >= 20 {
			return "", "", nil, apperror.New("TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.", 429)
		}
	}

	// dummyHash is used to equalize timing when the user is not found,
	// preventing timing-based account enumeration attacks.
	const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKo/uovHi"

	var user *model.User
	var err error

	// If input looks like a NIK (16 digits, no @), try NISN lookup first with email fallback
	isNIK := !strings.Contains(email, "@") && len(email) == 16 && isAllDigits(email)
	if isNIK {
		user, err = s.userRepo.FindByNISN(ctx, email)
		if err != nil || user == nil {
			// Fallback to email lookup
			user, err = s.userRepo.FindByEmail(ctx, email)
		}
	} else if !strings.Contains(email, "@") {
		// Non-email input that isn't a 16-digit NIK: try NISN anyway
		user, err = s.userRepo.FindByNISN(ctx, email)
	} else {
		user, err = s.userRepo.FindByEmail(ctx, email)
	}
	if err != nil || user == nil {
		// Run bcrypt against dummy hash to equalize timing and prevent account enumeration
		bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(password)) //nolint:errcheck
		// Increment failed attempt counters
		s.redis.Incr(ctx, rateLimitKey)
		s.redis.Expire(ctx, rateLimitKey, 15*time.Minute)
		if clientIP != "" {
			ipRateLimitKey := fmt.Sprintf("login_ip:%s", clientIP)
			s.redis.Incr(ctx, ipRateLimitKey)
			s.redis.Expire(ctx, ipRateLimitKey, 15*time.Minute)
		}
		return "", "", nil, apperror.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		// Increment failed attempt counters
		s.redis.Incr(ctx, rateLimitKey)
		s.redis.Expire(ctx, rateLimitKey, 15*time.Minute)
		if clientIP != "" {
			ipRateLimitKey := fmt.Sprintf("login_ip:%s", clientIP)
			s.redis.Incr(ctx, ipRateLimitKey)
			s.redis.Expire(ctx, ipRateLimitKey, 15*time.Minute)
		}
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

	// Atomically get-and-delete the old token. If it returns nil the token was
	// already consumed by a concurrent request — reject immediately to prevent
	// the race condition that allows two concurrent refreshes to both succeed.
	userIDStr, err := s.redis.GetDel(ctx, key).Result()
	if err != nil || userIDStr == "" {
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

	// Generate and store the new refresh token now that the old one is consumed
	newRefreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return "", "", apperror.ErrInternal
	}

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
		slog.Info("password reset requested")
	} else {
		// Non-existing user: store a dummy value (token will never be used)
		_ = s.redis.Set(ctx, key, "invalid", time.Hour).Err()
	}

	return nil
}

// ResetPassword validates the reset token and updates the user's password.
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	key := fmt.Sprintf("reset_token:%s", token)

	// Atomically get-and-delete the token to prevent concurrent requests with
	// the same token from all succeeding (race condition window eliminated).
	userIDStr, err := s.redis.GetDel(ctx, key).Result()
	if err != nil {
		return apperror.New("RESET_TOKEN_INVALID", "Token reset tidak valid atau sudah kedaluwarsa", 400)
	}

	if userIDStr == "invalid" {
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

// isAllDigits returns true if s is non-empty and contains only ASCII digits.
func isAllDigits(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}
