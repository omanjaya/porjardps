package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

// ---- Mock: UserRepository ----

type MockUserRepo struct {
	mock.Mock
}

func (m *MockUserRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepo) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepo) FindByNISN(ctx context.Context, nisn string) (*model.User, error) {
	args := m.Called(ctx, nisn)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserRepo) Create(ctx context.Context, u *model.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUserRepo) Update(ctx context.Context, u *model.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUserRepo) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	args := m.Called(ctx, id, passwordHash)
	return args.Error(0)
}

func (m *MockUserRepo) UpdateRole(ctx context.Context, id uuid.UUID, role string) error {
	args := m.Called(ctx, id, role)
	return args.Error(0)
}

func (m *MockUserRepo) List(ctx context.Context, filter model.UserFilter) ([]*model.User, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.User), args.Int(1), args.Error(2)
}

func (m *MockUserRepo) ListByNISN(ctx context.Context, filter model.UserNISNFilter) ([]*model.User, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.User), args.Error(1)
}

func (m *MockUserRepo) CountByRole(ctx context.Context, role string) (int, error) {
	args := m.Called(ctx, role)
	return args.Int(0), args.Error(1)
}

func (m *MockUserRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.User, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.User), args.Error(1)
}

// ---- Helper: create AuthService with a real Redis (mini-redis) or nil ----

func newTestAuthService(userRepo model.UserRepository, redisClient *redis.Client) *AuthService {
	return NewAuthService(userRepo, redisClient, AuthConfig{
		JWTSecret:    "test-secret-key-for-unit-tests",
		AccessExpiry: 15 * time.Minute,
		RefreshExpiry: 7 * 24 * time.Hour,
	})
}

// ========================================
// Register Tests
// ========================================

func TestRegister_Success(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userRepo.On("FindByEmail", ctx, "test@example.com").Return(nil, errors.New("not found"))
	userRepo.On("Create", ctx, mock.AnythingOfType("*model.User")).Return(nil)

	user, err := svc.Register(ctx, "test@example.com", "Password123", "Test User", "08123456789")

	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, "test@example.com", user.Email)
	assert.Equal(t, "Test User", user.FullName)
	assert.Equal(t, "player", user.Role)
	assert.NotNil(t, user.Phone)
	assert.Equal(t, "08123456789", *user.Phone)
	assert.NotEmpty(t, user.PasswordHash)
	// Verify the password hash is valid bcrypt
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("Password123")))
	userRepo.AssertExpectations(t)
}

func TestRegister_Success_NoPhone(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userRepo.On("FindByEmail", ctx, "test@example.com").Return(nil, errors.New("not found"))
	userRepo.On("Create", ctx, mock.AnythingOfType("*model.User")).Return(nil)

	user, err := svc.Register(ctx, "test@example.com", "Password123", "Test User", "")

	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Nil(t, user.Phone)
	userRepo.AssertExpectations(t)
}

func TestRegister_Error_EmailAlreadyExists(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	existingUser := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	userRepo.On("FindByEmail", ctx, "test@example.com").Return(existingUser, nil)

	user, err := svc.Register(ctx, "test@example.com", "Password123", "Test User", "")

	assert.Error(t, err)
	assert.Nil(t, user)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "EMAIL_ALREADY_EXISTS", appErr.Code)
	assert.Equal(t, 409, appErr.HTTPStatus)
}

func TestRegister_Error_CreateFails(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userRepo.On("FindByEmail", ctx, "test@example.com").Return(nil, errors.New("not found"))
	userRepo.On("Create", ctx, mock.AnythingOfType("*model.User")).Return(errors.New("db error"))

	user, err := svc.Register(ctx, "test@example.com", "Password123", "Test User", "")

	assert.Error(t, err)
	assert.Nil(t, user)
	assert.Equal(t, apperror.ErrInternal, err)
}

// ========================================
// Login Tests
// ========================================

func TestLogin_Success_ByEmail(t *testing.T) {
	// Full login flow requires a live Redis connection for token generation.
	// This test uses a mini-redis to verify the complete login path.
	ctx := context.Background()
	userRepo := new(MockUserRepo)

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	// Skip test if Redis is not available
	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping login success test")
	}
	defer redisClient.Close()

	svc := NewAuthService(userRepo, redisClient, AuthConfig{
		JWTSecret:     "test-secret",
		AccessExpiry:  15 * time.Minute,
		RefreshExpiry: 7 * 24 * time.Hour,
	})

	hash, _ := bcrypt.GenerateFromPassword([]byte("CorrectPass1"), bcrypt.DefaultCost)
	user := &model.User{
		ID:           uuid.New(),
		Email:        "player@example.com",
		PasswordHash: string(hash),
		FullName:     "Player One",
		Role:         "player",
	}

	userRepo.On("FindByEmail", ctx, "player@example.com").Return(user, nil)

	accessToken, refreshToken, returnedUser, err := svc.Login(ctx, "player@example.com", "CorrectPass1")

	assert.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.NotEmpty(t, refreshToken)
	assert.NotNil(t, returnedUser)
	assert.Equal(t, user.ID, returnedUser.ID)
}

func TestLogin_Error_UserNotFound(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userRepo.On("FindByEmail", ctx, "nonexistent@example.com").Return(nil, errors.New("not found"))

	_, _, _, err := svc.Login(ctx, "nonexistent@example.com", "Password123")

	assert.Error(t, err)
	assert.Equal(t, apperror.ErrInvalidCredentials, err)
}

func TestLogin_Error_WrongPassword(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	hash, _ := bcrypt.GenerateFromPassword([]byte("CorrectPass1"), bcrypt.DefaultCost)
	user := &model.User{
		ID:           uuid.New(),
		Email:        "player@example.com",
		PasswordHash: string(hash),
		Role:         "player",
	}

	userRepo.On("FindByEmail", ctx, "player@example.com").Return(user, nil)

	_, _, _, err := svc.Login(ctx, "player@example.com", "WrongPass999")

	assert.Error(t, err)
	assert.Equal(t, apperror.ErrInvalidCredentials, err)
}

func TestLogin_ByNISN_UserNotFound(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	// Input without "@" triggers NISN lookup
	userRepo.On("FindByNISN", ctx, "1234567890").Return(nil, errors.New("not found"))

	_, _, _, err := svc.Login(ctx, "1234567890", "Password123")

	assert.Error(t, err)
	assert.Equal(t, apperror.ErrInvalidCredentials, err)
	userRepo.AssertCalled(t, "FindByNISN", ctx, "1234567890")
}

// ========================================
// GetProfile Tests
// ========================================

func TestGetProfile_Success(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	user := &model.User{
		ID:       userID,
		Email:    "player@example.com",
		FullName: "Player One",
		Role:     "player",
	}

	userRepo.On("FindByID", ctx, userID).Return(user, nil)

	result, err := svc.GetProfile(ctx, userID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.ID)
	assert.Equal(t, "Player One", result.FullName)
}

func TestGetProfile_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	userRepo.On("FindByID", ctx, userID).Return(nil, errors.New("not found"))

	result, err := svc.GetProfile(ctx, userID)

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Contains(t, appErr.Code, "NOT_FOUND")
}

// ========================================
// UpdateProfile Tests
// ========================================

func TestUpdateProfile_Success(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	user := &model.User{
		ID:       userID,
		Email:    "player@example.com",
		FullName: "Old Name",
		Role:     "player",
	}

	userRepo.On("FindByID", ctx, userID).Return(user, nil)
	userRepo.On("Update", ctx, mock.MatchedBy(func(u *model.User) bool {
		return u.FullName == "New Name" && u.Phone != nil && *u.Phone == "081234"
	})).Return(nil)

	result, err := svc.UpdateProfile(ctx, userID, "New Name", "081234", "")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "New Name", result.FullName)
	assert.Equal(t, "081234", *result.Phone)
	assert.Nil(t, result.AvatarURL)
}

func TestUpdateProfile_Success_WithAvatar(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	user := &model.User{ID: userID, FullName: "Name"}

	userRepo.On("FindByID", ctx, userID).Return(user, nil)
	userRepo.On("Update", ctx, mock.AnythingOfType("*model.User")).Return(nil)

	result, err := svc.UpdateProfile(ctx, userID, "Name", "", "https://img.co/avatar.png")

	assert.NoError(t, err)
	assert.NotNil(t, result.AvatarURL)
	assert.Equal(t, "https://img.co/avatar.png", *result.AvatarURL)
}

func TestUpdateProfile_Error_UserNotFound(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	userRepo.On("FindByID", ctx, userID).Return(nil, errors.New("not found"))

	result, err := svc.UpdateProfile(ctx, userID, "Name", "", "")

	assert.Error(t, err)
	assert.Nil(t, result)
}

// ========================================
// ChangePassword Tests
// ========================================

func TestChangePassword_Success(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	oldHash, _ := bcrypt.GenerateFromPassword([]byte("OldPass123"), bcrypt.DefaultCost)
	user := &model.User{
		ID:           userID,
		PasswordHash: string(oldHash),
	}

	userRepo.On("FindByID", ctx, userID).Return(user, nil)
	userRepo.On("UpdatePassword", ctx, userID, mock.AnythingOfType("string")).Return(nil)

	err := svc.ChangePassword(ctx, userID, "OldPass123", "NewPass456")

	assert.NoError(t, err)
	userRepo.AssertExpectations(t)
}

func TestChangePassword_Error_WrongOldPassword(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	oldHash, _ := bcrypt.GenerateFromPassword([]byte("OldPass123"), bcrypt.DefaultCost)
	user := &model.User{
		ID:           userID,
		PasswordHash: string(oldHash),
	}

	userRepo.On("FindByID", ctx, userID).Return(user, nil)

	err := svc.ChangePassword(ctx, userID, "WrongOldPass", "NewPass456")

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "INVALID_OLD_PASSWORD", appErr.Code)
}

func TestChangePassword_Error_WeakNewPassword(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	oldHash, _ := bcrypt.GenerateFromPassword([]byte("OldPass123"), bcrypt.DefaultCost)
	user := &model.User{
		ID:           userID,
		PasswordHash: string(oldHash),
	}

	userRepo.On("FindByID", ctx, userID).Return(user, nil)

	// "short" is less than 8 chars and has no uppercase/number
	err := svc.ChangePassword(ctx, userID, "OldPass123", "short")

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "VALIDATION_ERROR", appErr.Code)
}

func TestChangePassword_Error_UserNotFound(t *testing.T) {
	ctx := context.Background()
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	userID := uuid.New()
	userRepo.On("FindByID", ctx, userID).Return(nil, errors.New("not found"))

	err := svc.ChangePassword(ctx, userID, "OldPass123", "NewPass456")

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Contains(t, appErr.Code, "NOT_FOUND")
}

// ========================================
// AccessExpiry Tests
// ========================================

func TestAccessExpiry_ReturnsConfigured(t *testing.T) {
	userRepo := new(MockUserRepo)
	svc := newTestAuthService(userRepo, nil)

	assert.Equal(t, 15*time.Minute, svc.AccessExpiry())
}
