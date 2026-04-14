package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

type NotificationService struct {
	repo     model.NotificationRepository
	userRepo model.UserRepository
	hub      *ws.Hub
}

func NewNotificationService(repo model.NotificationRepository, userRepo model.UserRepository, hub *ws.Hub) *NotificationService {
	return &NotificationService{repo: repo, userRepo: userRepo, hub: hub}
}

// Create saves a notification to the database and broadcasts it via WebSocket
func (s *NotificationService) Create(ctx context.Context, userID uuid.UUID, notifType, title, message string, data json.RawMessage) error {
	n := &model.Notification{
		ID:        uuid.New(),
		UserID:    userID,
		Type:      notifType,
		Title:     title,
		Message:   message,
		Data:      data,
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, n); err != nil {
		return fmt.Errorf("create notification: %w", err)
	}

	// Broadcast via WebSocket to user-specific channel
	broadcastData, err := ws.NewBroadcastData("notification", n)
	if err != nil {
		slog.Error("failed to marshal notification broadcast", "error", err)
		return nil // don't fail the operation if broadcast fails
	}

	room := fmt.Sprintf("user#%s", userID.String())
	s.hub.BroadcastToRoom(room, broadcastData)

	return nil
}

// GetByUser returns paginated notifications for a user
func (s *NotificationService) GetByUser(ctx context.Context, userID uuid.UUID, page, limit int) ([]*model.Notification, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	notifications, total, err := s.repo.FindByUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("get notifications: %w", err)
	}

	return notifications, total, nil
}

// MarkRead marks a single notification as read without an ownership check.
// This is intended for admin/internal paths only (e.g. system-triggered reads).
// For user-initiated reads, always use MarkReadForUser which verifies ownership.
func (s *NotificationService) MarkRead(ctx context.Context, notificationID uuid.UUID) error {
	if err := s.repo.MarkRead(ctx, notificationID); err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}

// MarkReadForUser marks a notification as read only if it belongs to the given user.
// Returns an error if the notification is not found or does not belong to the user.
func (s *NotificationService) MarkReadForUser(ctx context.Context, notificationID, userID uuid.UUID) error {
	n, err := s.repo.FindByID(ctx, notificationID)
	if err != nil {
		return fmt.Errorf("notification not found: %w", err)
	}
	if n.UserID != userID {
		return fmt.Errorf("forbidden: notification does not belong to user")
	}
	if err := s.repo.MarkRead(ctx, notificationID); err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}

// MarkAllRead marks all notifications for a user as read
func (s *NotificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	if err := s.repo.MarkAllRead(ctx, userID); err != nil {
		return fmt.Errorf("mark all read: %w", err)
	}
	return nil
}

// CountUnread returns the count of unread notifications for a user
func (s *NotificationService) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	count, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("count unread: %w", err)
	}
	return count, nil
}

// --- Helper methods for common notification types ---

// NotifyTeamApproved sends a notification when a team is approved
func (s *NotificationService) NotifyTeamApproved(ctx context.Context, userID uuid.UUID, teamName string, teamID uuid.UUID) {
	data, _ := json.Marshal(map[string]string{"team_id": teamID.String()})
	if err := s.Create(ctx, userID, "team_approved",
		"Tim Disetujui",
		fmt.Sprintf("Tim %s telah disetujui dan siap bertanding!", teamName),
		data,
	); err != nil {
		slog.Error("failed to send team_approved notification", "error", err, "user_id", userID)
	}
}

// NotifyTeamRejected sends a notification when a team is rejected
func (s *NotificationService) NotifyTeamRejected(ctx context.Context, userID uuid.UUID, teamName string, teamID uuid.UUID, reason string) {
	data, _ := json.Marshal(map[string]string{"team_id": teamID.String(), "reason": reason})
	msg := fmt.Sprintf("Tim %s ditolak.", teamName)
	if reason != "" {
		msg = fmt.Sprintf("Tim %s ditolak: %s", teamName, reason)
	}
	if err := s.Create(ctx, userID, "team_rejected",
		"Tim Ditolak",
		msg,
		data,
	); err != nil {
		slog.Error("failed to send team_rejected notification", "error", err, "user_id", userID)
	}
}

// NotifyMatchStarting sends a notification when a match is about to start
func (s *NotificationService) NotifyMatchStarting(ctx context.Context, userID uuid.UUID, matchLabel string, matchID uuid.UUID) {
	data, _ := json.Marshal(map[string]string{"match_id": matchID.String()})
	if err := s.Create(ctx, userID, "match_starting",
		"Pertandingan Segera Dimulai",
		fmt.Sprintf("Pertandingan %s akan segera dimulai. Bersiaplah!", matchLabel),
		data,
	); err != nil {
		slog.Error("failed to send match_starting notification", "error", err, "user_id", userID)
	}
}

// NotifyScoreUpdate sends a notification on score changes
func (s *NotificationService) NotifyScoreUpdate(ctx context.Context, userID uuid.UUID, matchLabel string, matchID uuid.UUID, scoreA, scoreB int) {
	data, _ := json.Marshal(map[string]interface{}{
		"match_id": matchID.String(),
		"score_a":  scoreA,
		"score_b":  scoreB,
	})
	if err := s.Create(ctx, userID, "score_update",
		"Update Skor",
		fmt.Sprintf("Skor terbaru %s: %d - %d", matchLabel, scoreA, scoreB),
		data,
	); err != nil {
		slog.Error("failed to send score_update notification", "error", err, "user_id", userID)
	}
}

// NotifyMatchResult sends notifications to all members of both teams when a bracket match completes.
func (s *NotificationService) NotifyMatchResult(ctx context.Context, winnerTeamID, loserTeamID uuid.UUID, winnerName, loserName string, memberRepo model.TeamMemberRepository) {
	matchData, _ := json.Marshal(map[string]string{
		"winner_team_id": winnerTeamID.String(),
		"loser_team_id":  loserTeamID.String(),
	})

	var notifications []*model.Notification

	if members, err := memberRepo.FindByTeam(ctx, winnerTeamID); err == nil {
		for _, m := range members {
			if m.UserID == nil {
				continue
			}
			notifications = append(notifications, &model.Notification{
				ID:        uuid.New(),
				UserID:    *m.UserID,
				Type:      "match_result",
				Title:     "Tim Kamu Menang!",
				Message:   fmt.Sprintf("%s menang vs %s", winnerName, loserName),
				Data:      matchData,
				IsRead:    false,
				CreatedAt: time.Now(),
			})
		}
	}

	if members, err := memberRepo.FindByTeam(ctx, loserTeamID); err == nil {
		for _, m := range members {
			if m.UserID == nil {
				continue
			}
			notifications = append(notifications, &model.Notification{
				ID:        uuid.New(),
				UserID:    *m.UserID,
				Type:      "match_result",
				Title:     "Pertandingan Selesai",
				Message:   fmt.Sprintf("%s kalah dari %s", loserName, winnerName),
				Data:      matchData,
				IsRead:    false,
				CreatedAt: time.Now(),
			})
		}
	}

	if len(notifications) == 0 {
		return
	}

	if err := s.repo.BulkCreate(ctx, notifications); err != nil {
		slog.Error("failed to bulk create match_result notifications", "error", err)
		return
	}

	// Broadcast each notification via WebSocket to user-specific channels.
	// Only runs after successful BulkCreate so we never broadcast phantom notifications.
	if s.hub != nil {
		for _, n := range notifications {
			broadcastData, err := ws.NewBroadcastData("notification", n)
			if err != nil {
				continue
			}
			room := fmt.Sprintf("user#%s", n.UserID.String())
			s.hub.BroadcastToRoom(room, broadcastData)
		}
	}
}

// notifyAllAdmins sends a notification to all admin and superadmin users.
func (s *NotificationService) notifyAllAdmins(ctx context.Context, notifType, title, message string, data json.RawMessage) {
	for _, role := range []string{"admin", "superadmin"} {
		r := role
		admins, _, err := s.userRepo.List(ctx, model.UserFilter{Role: &r, Page: 1, Limit: 200})
		if err != nil {
			slog.Error("failed to list admins for notification", "error", err, "role", role)
			continue
		}
		for _, admin := range admins {
			if err := s.Create(ctx, admin.ID, notifType, title, message, data); err != nil {
				slog.Error("failed to send admin notification", "error", err, "admin_id", admin.ID)
			}
		}
	}
}

// NotifyAdminNewSubmission notifies admins when a new match submission is received.
func (s *NotificationService) NotifyAdminNewSubmission(ctx context.Context, teamName, gameName, matchLabel string) {
	data, _ := json.Marshal(map[string]string{"team": teamName, "game": gameName})
	s.notifyAllAdmins(ctx, "new_submission",
		"Submission Baru",
		fmt.Sprintf("%s mengirim hasil %s (%s)", teamName, matchLabel, gameName),
		data,
	)
}

// NotifyAdminMatchCompleted notifies admins when a match is completed.
func (s *NotificationService) NotifyAdminMatchCompleted(ctx context.Context, winnerName, loserName, gameName string, matchID uuid.UUID) {
	data, _ := json.Marshal(map[string]string{"match_id": matchID.String()})
	s.notifyAllAdmins(ctx, "match_completed",
		"Pertandingan Selesai",
		fmt.Sprintf("%s vs %s selesai — Pemenang: %s (%s)", winnerName, loserName, winnerName, gameName),
		data,
	)
}

// NotifyRegistrationConfirmed sends a notification when registration is confirmed
func (s *NotificationService) NotifyRegistrationConfirmed(ctx context.Context, userID uuid.UUID, tournamentName string, tournamentID uuid.UUID) {
	data, _ := json.Marshal(map[string]string{"tournament_id": tournamentID.String()})
	if err := s.Create(ctx, userID, "registration_confirmed",
		"Pendaftaran Dikonfirmasi",
		fmt.Sprintf("Pendaftaran untuk turnamen %s telah dikonfirmasi!", tournamentName),
		data,
	); err != nil {
		slog.Error("failed to send registration_confirmed notification", "error", err, "user_id", userID)
	}
}
