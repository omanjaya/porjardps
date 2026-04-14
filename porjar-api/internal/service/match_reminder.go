package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/redis/go-redis/v9"
)

// MatchReminderService sends notifications to players ~30 minutes before their
// bracket or BR lobby match starts.  It runs a background ticker every 5 minutes,
// queries for matches scheduled within the next 35 minutes, and uses Redis keys
// to guarantee each reminder is sent at most once (survives restarts).
type MatchReminderService struct {
	bracketRepo  model.BracketRepository
	brLobbyRepo  model.BRLobbyRepository
	brResultRepo model.BRLobbyResultRepository
	teamRepo     model.TeamRepository
	memberRepo   model.TeamMemberRepository
	notifSvc     *NotificationService
	rdb          *redis.Client
}

func NewMatchReminderService(
	bracketRepo model.BracketRepository,
	brLobbyRepo model.BRLobbyRepository,
	brResultRepo model.BRLobbyResultRepository,
	teamRepo model.TeamRepository,
	memberRepo model.TeamMemberRepository,
	notifSvc *NotificationService,
	rdb *redis.Client,
) *MatchReminderService {
	return &MatchReminderService{
		bracketRepo:  bracketRepo,
		brLobbyRepo:  brLobbyRepo,
		brResultRepo: brResultRepo,
		teamRepo:     teamRepo,
		memberRepo:   memberRepo,
		notifSvc:     notifSvc,
		rdb:          rdb,
	}
}

// Start launches the background goroutine.  It stops when ctx is cancelled.
func (s *MatchReminderService) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		slog.Info("match reminder service started", "interval", "5m")

		// Run once immediately so we don't have to wait 5 min after startup.
		s.tick(ctx)

		for {
			select {
			case <-ctx.Done():
				slog.Info("match reminder service stopped")
				return
			case <-ticker.C:
				s.tick(ctx)
			}
		}
	}()
}

func (s *MatchReminderService) tick(ctx context.Context) {
	// Use a bounded context so one slow tick doesn't block the next.
	tickCtx, cancel := context.WithTimeout(ctx, 4*time.Minute)
	defer cancel()

	now := time.Now()

	s.remindBracketMatches(tickCtx, now)
	s.remindBRLobbies(tickCtx, now)
}

// remindBracketMatches finds bracket matches scheduled within the next 35 minutes
// and sends reminders to all team members of both teams.
func (s *MatchReminderService) remindBracketMatches(ctx context.Context, now time.Time) {
	horizon := now.Add(35 * time.Minute)

	matches, err := s.bracketRepo.ListScheduledBefore(ctx, horizon)
	if err != nil {
		slog.Error("match reminder: failed to list bracket matches", "error", err)
		return
	}

	for _, m := range matches {
		if err := s.sendBracketReminder(ctx, m); err != nil {
			slog.Error("match reminder: failed to send bracket reminder",
				"match_id", m.ID, "error", err)
		}
	}
}

// remindBRLobbies finds BR lobbies scheduled within the next 35 minutes
// and sends reminders to all team members participating.
func (s *MatchReminderService) remindBRLobbies(ctx context.Context, now time.Time) {
	horizon := now.Add(35 * time.Minute)

	lobbies, err := s.brLobbyRepo.ListScheduledBefore(ctx, horizon)
	if err != nil {
		slog.Error("match reminder: failed to list BR lobbies", "error", err)
		return
	}

	for _, l := range lobbies {
		if err := s.sendBRLobbyReminder(ctx, l); err != nil {
			slog.Error("match reminder: failed to send BR lobby reminder",
				"lobby_id", l.ID, "error", err)
		}
	}
}

// sendBracketReminder sends a reminder for a single bracket match, skipping if
// already sent (Redis dedup).
func (s *MatchReminderService) sendBracketReminder(ctx context.Context, m *model.BracketMatch) error {
	redisKey := fmt.Sprintf("reminder:bracket:%s", m.ID.String())

	// SETNX returns true only if the key was newly created — acts as a distributed lock.
	set, err := s.rdb.SetNX(ctx, redisKey, "1", 1*time.Hour).Result()
	if err != nil {
		return fmt.Errorf("redis setnx: %w", err)
	}
	if !set {
		return nil // already sent
	}

	// Skip matches with no teams assigned (BYE or not yet seeded).
	if m.TeamAID == nil && m.TeamBID == nil {
		return nil
	}

	// Resolve team names for a human-readable message.
	teamAName, teamBName := s.resolveTeamNames(ctx, m.TeamAID, m.TeamBID)

	scheduledAtStr := ""
	if m.ScheduledAt != nil {
		scheduledAtStr = m.ScheduledAt.Format(time.RFC3339)
	}

	data, err := json.Marshal(map[string]string{
		"match_id":     m.ID.String(),
		"scheduled_at": scheduledAtStr,
	})
	if err != nil {
		slog.Error("reminder: failed to marshal notification data", "match_id", m.ID, "error", err)
		return nil
	}

	var message string
	if teamAName != "" && teamBName != "" {
		message = fmt.Sprintf("Pertandingan %s vs %s dimulai dalam 30 menit", teamAName, teamBName)
	} else if teamAName != "" {
		message = fmt.Sprintf("Pertandingan %s dimulai dalam 30 menit", teamAName)
	} else {
		message = fmt.Sprintf("Pertandingan %s dimulai dalam 30 menit", teamBName)
	}

	// Notify all members of both teams.
	s.notifyTeamMembers(ctx, m.TeamAID, "match_reminder", "Match Dimulai Segera", message, data)
	s.notifyTeamMembers(ctx, m.TeamBID, "match_reminder", "Match Dimulai Segera", message, data)

	slog.Info("match reminder: bracket reminder sent",
		"match_id", m.ID, "team_a", teamAName, "team_b", teamBName)

	return nil
}

// sendBRLobbyReminder sends a reminder for a single BR lobby, skipping if
// already sent (Redis dedup).
func (s *MatchReminderService) sendBRLobbyReminder(ctx context.Context, l *model.BRLobby) error {
	redisKey := fmt.Sprintf("reminder:brlobby:%s", l.ID.String())

	set, err := s.rdb.SetNX(ctx, redisKey, "1", 1*time.Hour).Result()
	if err != nil {
		return fmt.Errorf("redis setnx: %w", err)
	}
	if !set {
		return nil // already sent
	}

	scheduledAtStr := ""
	if l.ScheduledAt != nil {
		scheduledAtStr = l.ScheduledAt.Format(time.RFC3339)
	}

	data, err := json.Marshal(map[string]string{
		"lobby_id":     l.ID.String(),
		"lobby_name":   l.LobbyName,
		"scheduled_at": scheduledAtStr,
	})
	if err != nil {
		slog.Error("reminder: failed to marshal notification data", "lobby_id", l.ID, "error", err)
		return nil
	}

	message := fmt.Sprintf("Lobby %s dimulai dalam 30 menit", l.LobbyName)

	// Find teams participating in this lobby via existing results.
	results, err := s.brResultRepo.ListByLobby(ctx, l.ID)
	if err != nil {
		slog.Error("match reminder: failed to list BR lobby results", "lobby_id", l.ID, "error", err)
		return nil // non-fatal — lobby may not have results pre-populated
	}

	for _, r := range results {
		s.notifyTeamMembers(ctx, &r.TeamID, "match_reminder", "Match Dimulai Segera", message, data)
	}

	slog.Info("match reminder: BR lobby reminder sent",
		"lobby_id", l.ID, "lobby_name", l.LobbyName, "teams", len(results))

	return nil
}

// notifyTeamMembers sends a notification to every linked user in the given team.
func (s *MatchReminderService) notifyTeamMembers(ctx context.Context, teamID *uuid.UUID, notifType, title, message string, data json.RawMessage) {
	if teamID == nil {
		return
	}

	members, err := s.memberRepo.FindByTeam(ctx, *teamID)
	if err != nil {
		slog.Error("match reminder: failed to list team members",
			"team_id", teamID, "error", err)
		return
	}

	for _, m := range members {
		if m.UserID == nil {
			continue
		}
		if err := s.notifSvc.Create(ctx, *m.UserID, notifType, title, message, data); err != nil {
			slog.Error("match reminder: failed to create notification",
				"user_id", m.UserID, "error", err)
		}
	}
}

// resolveTeamNames batch-fetches team names for up to two team IDs.
func (s *MatchReminderService) resolveTeamNames(ctx context.Context, teamAID, teamBID *uuid.UUID) (string, string) {
	ids := make([]uuid.UUID, 0, 2)
	if teamAID != nil {
		ids = append(ids, *teamAID)
	}
	if teamBID != nil {
		ids = append(ids, *teamBID)
	}
	if len(ids) == 0 {
		return "", ""
	}

	teams, err := s.teamRepo.FindByIDs(ctx, ids)
	if err != nil {
		slog.Error("match reminder: failed to resolve team names", "error", err)
		return "", ""
	}

	nameMap := make(map[uuid.UUID]string, len(teams))
	for _, t := range teams {
		nameMap[t.ID] = t.Name
	}

	var nameA, nameB string
	if teamAID != nil {
		nameA = nameMap[*teamAID]
	}
	if teamBID != nil {
		nameB = nameMap[*teamBID]
	}
	return nameA, nameB
}
