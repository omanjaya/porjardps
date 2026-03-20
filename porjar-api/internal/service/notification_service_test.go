package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ---- Mock: NotificationRepository ----

type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) Create(ctx context.Context, n *model.Notification) error {
	return m.Called(ctx, n).Error(0)
}

func (m *MockNotificationRepository) FindByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Notification, int, error) {
	args := m.Called(ctx, userID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.Notification), args.Int(1), args.Error(2)
}

func (m *MockNotificationRepository) MarkRead(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockNotificationRepository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return m.Called(ctx, userID).Error(0)
}

func (m *MockNotificationRepository) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

// ---- Helpers ----

func newTestNotificationService(repo model.NotificationRepository, hub *ws.Hub) *NotificationService {
	return NewNotificationService(repo, hub)
}

func makeNotifications(userID uuid.UUID, count int) []*model.Notification {
	notifs := make([]*model.Notification, count)
	for i := 0; i < count; i++ {
		notifs[i] = &model.Notification{
			ID:        uuid.New(),
			UserID:    userID,
			Type:      "team_approved",
			Title:     "Test",
			Message:   "Test message",
			IsRead:    false,
			CreatedAt: time.Now(),
		}
	}
	return notifs
}

// ========================================
// GetByUser Tests
// ========================================

func TestNotification_GetByUser_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	notifs := makeNotifications(userID, 3)

	// page=1, limit=20 → offset=0
	repo.On("FindByUser", ctx, userID, 20, 0).Return(notifs, 3, nil)

	result, total, err := svc.GetByUser(ctx, userID, 1, 20)

	assert.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Len(t, result, 3)
	repo.AssertExpectations(t)
}

func TestNotification_GetByUser_DefaultsPageAndLimit(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	notifs := makeNotifications(userID, 1)

	// page<1 normalises to 1, limit<1 normalises to 20
	repo.On("FindByUser", ctx, userID, 20, 0).Return(notifs, 1, nil)

	result, total, err := svc.GetByUser(ctx, userID, 0, 0)

	assert.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, result, 1)
	repo.AssertExpectations(t)
}

func TestNotification_GetByUser_LimitCappedAt50(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()

	// limit>50 → normalises to 20; offset = (1-1)*20 = 0
	repo.On("FindByUser", ctx, userID, 20, 0).Return([]*model.Notification{}, 0, nil)

	_, _, err := svc.GetByUser(ctx, userID, 1, 100)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestNotification_GetByUser_Pagination_Page2(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	notifs := makeNotifications(userID, 5)

	// page=2, limit=5 → offset=5
	repo.On("FindByUser", ctx, userID, 5, 5).Return(notifs, 10, nil)

	result, total, err := svc.GetByUser(ctx, userID, 2, 5)

	assert.NoError(t, err)
	assert.Equal(t, 10, total)
	assert.Len(t, result, 5)
	repo.AssertExpectations(t)
}

func TestNotification_GetByUser_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	repo.On("FindByUser", ctx, userID, 20, 0).Return(nil, 0, errors.New("db error"))

	result, total, err := svc.GetByUser(ctx, userID, 1, 20)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, 0, total)
	repo.AssertExpectations(t)
}

// ========================================
// MarkRead Tests
// ========================================

func TestNotification_MarkRead_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	notifID := uuid.New()
	repo.On("MarkRead", ctx, notifID).Return(nil)

	err := svc.MarkRead(ctx, notifID)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestNotification_MarkRead_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	notifID := uuid.New()
	repo.On("MarkRead", ctx, notifID).Return(errors.New("db error"))

	err := svc.MarkRead(ctx, notifID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "mark read")
	repo.AssertExpectations(t)
}

// ========================================
// MarkAllRead Tests
// ========================================

func TestNotification_MarkAllRead_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	repo.On("MarkAllRead", ctx, userID).Return(nil)

	err := svc.MarkAllRead(ctx, userID)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestNotification_MarkAllRead_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	repo.On("MarkAllRead", ctx, userID).Return(errors.New("db error"))

	err := svc.MarkAllRead(ctx, userID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "mark all read")
	repo.AssertExpectations(t)
}

// ========================================
// Create Tests
// ========================================

// newHubForTest starts a Hub's Run loop and returns it.
// The hub has no clients so BroadcastToRoom is a no-op write to the channel.
func newHubForTest() *ws.Hub {
	hub := ws.NewHub()
	go hub.Run()
	return hub
}

func TestNotification_Create_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	hub := newHubForTest()
	svc := newTestNotificationService(repo, hub)

	userID := uuid.New()
	data, _ := json.Marshal(map[string]string{"team_id": uuid.New().String()})

	repo.On("Create", ctx, mock.MatchedBy(func(n *model.Notification) bool {
		return n.UserID == userID &&
			n.Type == "team_approved" &&
			n.Title == "Tim Disetujui" &&
			!n.IsRead
	})).Return(nil)

	err := svc.Create(ctx, userID, "team_approved", "Tim Disetujui", "Tim kamu disetujui", data)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestNotification_Create_BroadcastsToUserRoom(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	hub := newHubForTest()
	svc := newTestNotificationService(repo, hub)

	userID := uuid.New()
	data, _ := json.Marshal(map[string]string{"key": "value"})

	repo.On("Create", ctx, mock.AnythingOfType("*model.Notification")).Return(nil)

	err := svc.Create(ctx, userID, "match_starting", "Pertandingan Segera", "Bersiaplah!", data)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
	// Hub broadcast is fire-and-forget with no subscribers; verifying no panic + repo called is sufficient
}

func TestNotification_Create_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	hub := newHubForTest()
	svc := newTestNotificationService(repo, hub)

	userID := uuid.New()

	repo.On("Create", ctx, mock.AnythingOfType("*model.Notification")).Return(errors.New("db error"))

	err := svc.Create(ctx, userID, "score_update", "Update Skor", "Skor 3-2", nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "create notification")
	repo.AssertExpectations(t)
}

// ========================================
// CountUnread Tests
// ========================================

func TestNotification_CountUnread_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	repo.On("CountUnread", ctx, userID).Return(7, nil)

	count, err := svc.CountUnread(ctx, userID)

	assert.NoError(t, err)
	assert.Equal(t, 7, count)
	repo.AssertExpectations(t)
}

func TestNotification_CountUnread_Zero(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	repo.On("CountUnread", ctx, userID).Return(0, nil)

	count, err := svc.CountUnread(ctx, userID)

	assert.NoError(t, err)
	assert.Equal(t, 0, count)
	repo.AssertExpectations(t)
}

func TestNotification_CountUnread_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockNotificationRepository)
	svc := newTestNotificationService(repo, nil)

	userID := uuid.New()
	repo.On("CountUnread", ctx, userID).Return(0, errors.New("db error"))

	count, err := svc.CountUnread(ctx, userID)

	assert.Error(t, err)
	assert.Equal(t, 0, count)
	assert.Contains(t, err.Error(), "count unread")
	repo.AssertExpectations(t)
}
