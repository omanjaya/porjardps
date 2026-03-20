package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

type BracketService struct {
	bracketRepo    model.BracketRepository
	matchGameRepo  model.MatchGameRepository
	tournamentRepo model.TournamentRepository
	ttRepo         model.TournamentTeamRepository
	teamRepo       model.TeamRepository
	standingsRepo  model.StandingsRepository
	hub            *ws.Hub
	memberRepo     model.TeamMemberRepository
	notifSvc       *NotificationService
}

func (s *BracketService) SetMemberRepo(r model.TeamMemberRepository) { s.memberRepo = r }
func (s *BracketService) SetNotificationService(n *NotificationService) { s.notifSvc = n }

func NewBracketService(
	bracketRepo model.BracketRepository,
	matchGameRepo model.MatchGameRepository,
	tournamentRepo model.TournamentRepository,
	ttRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
	standingsRepo model.StandingsRepository,
	hub *ws.Hub,
) *BracketService {
	return &BracketService{
		bracketRepo:    bracketRepo,
		matchGameRepo:  matchGameRepo,
		tournamentRepo: tournamentRepo,
		ttRepo:         ttRepo,
		teamRepo:       teamRepo,
		standingsRepo:  standingsRepo,
		hub:            hub,
	}
}

// GetBracket retrieves all bracket matches for a tournament, enriched with team data.
func (s *BracketService) GetBracket(ctx context.Context, tournamentID uuid.UUID) ([]*model.BracketMatch, error) {
	matches, err := s.bracketRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "get bracket")
	}

	// Get tournament for best_of
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil {
		slog.Error("failed to fetch tournament for best_of", "error", err)
	}

	// Collect unique team IDs from all matches
	teamIDSet := make(map[uuid.UUID]struct{})
	for _, m := range matches {
		if m.TeamAID != nil {
			teamIDSet[*m.TeamAID] = struct{}{}
		}
		if m.TeamBID != nil {
			teamIDSet[*m.TeamBID] = struct{}{}
		}
		if m.WinnerID != nil {
			teamIDSet[*m.WinnerID] = struct{}{}
		}
	}

	// Batch fetch teams using FindByIDs
	teamCache := make(map[uuid.UUID]*model.TeamSummary, len(teamIDSet))
	if s.teamRepo != nil && len(teamIDSet) > 0 {
		teamIDs := make([]uuid.UUID, 0, len(teamIDSet))
		for id := range teamIDSet {
			teamIDs = append(teamIDs, id)
		}
		teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
		if err != nil {
			slog.Error("failed to batch fetch teams for bracket enrichment", "error", err)
		} else {
			for _, team := range teams {
				teamCache[team.ID] = &model.TeamSummary{
					ID:            team.ID,
					Name:          team.Name,
					Seed:          team.Seed,
					LogoURL:       team.LogoURL,
					SchoolLogoURL: team.SchoolLogoURL,
				}
			}
		}
	}

	// Enrich each match with team data
	for _, m := range matches {
		if m.TeamAID != nil {
			m.TeamA = teamCache[*m.TeamAID]
		}
		if m.TeamBID != nil {
			m.TeamB = teamCache[*m.TeamBID]
		}
		if m.WinnerID != nil {
			m.Winner = teamCache[*m.WinnerID]
		}
		if tournament != nil {
			m.BestOf = tournament.BestOf
		}
	}

	return matches, nil
}

// GetMatch retrieves a single match by ID.
func (s *BracketService) GetMatch(ctx context.Context, matchID uuid.UUID) (*model.BracketMatch, error) {
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return nil, apperror.NotFound("MATCH")
	}

	// Batch fetch all teams referenced by this match in a single query
	if s.teamRepo != nil {
		teamIDSet := make(map[uuid.UUID]struct{})
		if match.TeamAID != nil {
			teamIDSet[*match.TeamAID] = struct{}{}
		}
		if match.TeamBID != nil {
			teamIDSet[*match.TeamBID] = struct{}{}
		}
		if match.WinnerID != nil {
			teamIDSet[*match.WinnerID] = struct{}{}
		}

		if len(teamIDSet) > 0 {
			teamIDs := make([]uuid.UUID, 0, len(teamIDSet))
			for id := range teamIDSet {
				teamIDs = append(teamIDs, id)
			}
			teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
			if err != nil {
				slog.Error("failed to batch fetch teams for match enrichment", "error", err)
			} else {
				teamCache := make(map[uuid.UUID]*model.TeamSummary, len(teams))
				for _, t := range teams {
					teamCache[t.ID] = &model.TeamSummary{ID: t.ID, Name: t.Name, Seed: t.Seed, LogoURL: t.LogoURL}
				}
				if match.TeamAID != nil {
					match.TeamA = teamCache[*match.TeamAID]
				}
				if match.TeamBID != nil {
					match.TeamB = teamCache[*match.TeamBID]
				}
				if match.WinnerID != nil {
					match.Winner = teamCache[*match.WinnerID]
				}
			}
		}
	}

	// Enrich best_of from tournament
	tournament, err := s.tournamentRepo.FindByID(ctx, match.TournamentID)
	if err == nil && tournament != nil && match.BestOf == 0 {
		match.BestOf = tournament.BestOf
	}

	return match, nil
}

// GetLiveMatches returns all live matches across tournaments.
func (s *BracketService) GetLiveMatches(ctx context.Context) ([]*model.BracketMatch, error) {
	liveMatches, err := s.bracketRepo.FindLiveAcrossAllTournaments(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "find live matches")
	}
	return liveMatches, nil
}

// GetRecentCompleted returns the most recently completed matches across all tournaments, enriched with team data.
func (s *BracketService) GetRecentCompleted(ctx context.Context, limit int) ([]*model.BracketMatch, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	matches, err := s.bracketRepo.FindRecentCompleted(ctx, limit)
	if err != nil {
		return nil, apperror.Wrap(err, "find recent completed matches")
	}

	if s.teamRepo == nil || len(matches) == 0 {
		return matches, nil
	}

	teamIDSet := make(map[uuid.UUID]struct{})
	for _, m := range matches {
		if m.TeamAID != nil {
			teamIDSet[*m.TeamAID] = struct{}{}
		}
		if m.TeamBID != nil {
			teamIDSet[*m.TeamBID] = struct{}{}
		}
		if m.WinnerID != nil {
			teamIDSet[*m.WinnerID] = struct{}{}
		}
	}
	teamIDs := make([]uuid.UUID, 0, len(teamIDSet))
	for id := range teamIDSet {
		teamIDs = append(teamIDs, id)
	}
	teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
	if err != nil {
		slog.Error("failed to enrich recent completed matches", "error", err)
		return matches, nil
	}
	teamCache := make(map[uuid.UUID]*model.TeamSummary, len(teams))
	for _, t := range teams {
		teamCache[t.ID] = &model.TeamSummary{ID: t.ID, Name: t.Name, Seed: t.Seed, LogoURL: t.LogoURL}
	}
	for _, m := range matches {
		if m.TeamAID != nil {
			m.TeamA = teamCache[*m.TeamAID]
		}
		if m.TeamBID != nil {
			m.TeamB = teamCache[*m.TeamBID]
		}
		if m.WinnerID != nil {
			m.Winner = teamCache[*m.WinnerID]
		}
	}
	return matches, nil
}

// --- helper methods ---

func (s *BracketService) updateMatchSeriesScore(ctx context.Context, match *model.BracketMatch, teamAWins, teamBWins int) error {
	match.ScoreA = &teamAWins
	match.ScoreB = &teamBWins
	return s.bracketRepo.Update(ctx, match)
}

func (s *BracketService) broadcastMatchUpdate(tournamentID uuid.UUID, matchID uuid.UUID, msgType string, data interface{}) {
	if s.hub == nil {
		return
	}

	payload, err := ws.NewBroadcastData(msgType, data)
	if err != nil {
		slog.Error("failed to marshal broadcast data", "error", err)
		return
	}

	// Broadcast to tournament room
	s.hub.BroadcastToRoom(fmt.Sprintf("tournament:%s", tournamentID.String()), payload)

	// Broadcast to match room
	s.hub.BroadcastToRoom(fmt.Sprintf("match:%s", matchID.String()), payload)
}

func isValidTransition(from, to string) bool {
	transitions := map[string][]string{
		"pending":   {"scheduled", "live"},
		"scheduled": {"live"},
		"live":      {"completed"},
	}

	allowed, ok := transitions[from]
	if !ok {
		return false
	}
	for _, a := range allowed {
		if a == to {
			return true
		}
	}
	return false
}

func countWins(games []*model.MatchGame, teamAID, teamBID *uuid.UUID) (int, int) {
	var teamAWins, teamBWins int
	for _, g := range games {
		if g.WinnerID == nil {
			continue
		}
		if teamAID != nil && *g.WinnerID == *teamAID {
			teamAWins++
		} else if teamBID != nil && *g.WinnerID == *teamBID {
			teamBWins++
		}
	}
	return teamAWins, teamBWins
}
