package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

type RefereeService struct {
	cardRepo        model.MatchCardRepository
	assignmentRepo  model.RefereeAssignmentRepository
	configRepo      model.TournamentPenaltyConfigRepository
	tournamentRepo  model.TournamentRepository
	teamRepo        model.TeamRepository
	bracketRepo     model.BracketRepository
	brLobbyRepo     model.BRLobbyRepository
	standingsRepo   model.StandingsRepository
	brLobbyTeamRepo model.BRLobbyTeamRepository
	groupRepo       model.GroupRepository
	hub             *ws.Hub
}

func NewRefereeService(
	cardRepo model.MatchCardRepository,
	assignmentRepo model.RefereeAssignmentRepository,
	configRepo model.TournamentPenaltyConfigRepository,
	tournamentRepo model.TournamentRepository,
	teamRepo model.TeamRepository,
	bracketRepo model.BracketRepository,
	brLobbyRepo model.BRLobbyRepository,
	standingsRepo model.StandingsRepository,
	brLobbyTeamRepo model.BRLobbyTeamRepository,
	groupRepo model.GroupRepository,
	hub *ws.Hub,
) *RefereeService {
	return &RefereeService{
		cardRepo:        cardRepo,
		assignmentRepo:  assignmentRepo,
		configRepo:      configRepo,
		tournamentRepo:  tournamentRepo,
		teamRepo:        teamRepo,
		bracketRepo:     bracketRepo,
		brLobbyRepo:     brLobbyRepo,
		standingsRepo:   standingsRepo,
		brLobbyTeamRepo: brLobbyTeamRepo,
		groupRepo:       groupRepo,
		hub:             hub,
	}
}

// GetLiveMatchesToday returns all currently live matches across all match types and tournaments.
func (s *RefereeService) GetLiveMatchesToday(ctx context.Context) ([]*model.LiveMatch, error) {
	var liveMatches []*model.LiveMatch

	// tournament name cache to avoid repeated lookups
	tournamentNames := map[uuid.UUID]string{}
	getTournamentName := func(id uuid.UUID) string {
		if name, ok := tournamentNames[id]; ok {
			return name
		}
		t, err := s.tournamentRepo.FindByID(ctx, id)
		if err != nil || t == nil {
			return ""
		}
		tournamentNames[id] = t.Name
		return t.Name
	}

	// Bracket live matches
	bracketMatches, err := s.bracketRepo.FindLiveAcrossAllTournaments(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "get live bracket matches")
	}
	for _, m := range bracketMatches {
		lm := &model.LiveMatch{
			Type:           "bracket",
			MatchID:        m.ID,
			TournamentID:   m.TournamentID,
			TournamentName: getTournamentName(m.TournamentID),
			Status:         m.Status,
			Round:          &m.Round,
			MatchNumber:    &m.MatchNumber,
			TeamAName:      "TBD",
			TeamBName:      "TBD",
		}
		if m.TeamAID != nil {
			lm.TeamAID = m.TeamAID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamAID); tErr == nil && team != nil {
				lm.TeamAName = team.Name
			}
		}
		if m.TeamBID != nil {
			lm.TeamBID = m.TeamBID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamBID); tErr == nil && team != nil {
				lm.TeamBName = team.Name
			}
		}
		liveMatches = append(liveMatches, lm)
	}

	// BR live lobbies
	brLobbies, err := s.brLobbyRepo.FindLiveAcrossAllTournaments(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "get live BR lobbies")
	}
	for _, l := range brLobbies {
		lm := &model.LiveMatch{
			Type:           "br",
			MatchID:        l.ID,
			TournamentID:   l.TournamentID,
			TournamentName: getTournamentName(l.TournamentID),
			Status:         l.Status,
			LobbyName:      &l.LobbyName,
			TeamAName:      l.LobbyName,
			TeamBName:      "Battle Royale",
		}
		liveMatches = append(liveMatches, lm)
	}

	// Group stage live matches
	groupMatches, err := s.groupRepo.FindLiveMatches(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "get live group matches")
	}
	for _, m := range groupMatches {
		group, grpErr := s.groupRepo.FindGroupByID(ctx, m.GroupID)
		if grpErr != nil || group == nil {
			continue
		}
		lm := &model.LiveMatch{
			Type:           "group",
			MatchID:        m.ID,
			TournamentID:   group.TournamentID,
			TournamentName: getTournamentName(group.TournamentID),
			Status:         m.Status,
			Round:          &m.Round,
			MatchNumber:    &m.MatchNumber,
			TeamAName:      "TBD",
			TeamBName:      "TBD",
		}
		if m.TeamAID != nil {
			lm.TeamAID = m.TeamAID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamAID); tErr == nil && team != nil {
				lm.TeamAName = team.Name
			}
		}
		if m.TeamBID != nil {
			lm.TeamBID = m.TeamBID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamBID); tErr == nil && team != nil {
				lm.TeamBName = team.Name
			}
		}
		liveMatches = append(liveMatches, lm)
	}

	return liveMatches, nil
}

// IssueCard creates a new match card (yellow/red) for a team.
func (s *RefereeService) IssueCard(
	ctx context.Context,
	refereeID, tournamentID, teamID uuid.UUID,
	cardType, reason string,
	bracketMatchID, brLobbyID, groupMatchID *uuid.UUID,
) (*model.MatchCard, error) {
	// Verify tournament exists
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	// Verify referee is assigned to the specific match or lobby within this tournament
	assigned, err := s.assignmentRepo.IsAssigned(ctx, refereeID, bracketMatchID, brLobbyID, groupMatchID)
	if err != nil {
		return nil, apperror.Wrap(err, "check referee assignment")
	}
	if !assigned {
		// Fall back: check if referee has any assignment in this tournament
		tournamentAssignments, taErr := s.assignmentRepo.FindByTournament(ctx, tournamentID)
		if taErr != nil {
			return nil, apperror.Wrap(taErr, "check tournament assignment")
		}
		refereeInTournament := false
		for _, a := range tournamentAssignments {
			if a.RefereeID == refereeID {
				refereeInTournament = true
				break
			}
		}
		if !refereeInTournament {
			return nil, apperror.New("REFEREE_NOT_ASSIGNED", "Referee tidak ditugaskan ke turnamen ini", 403)
		}
	}

	// Verify team exists
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	// Validate team is a participant in the match and match belongs to tournament
	if bracketMatchID != nil {
		match, matchErr := s.bracketRepo.FindByID(ctx, *bracketMatchID)
		if matchErr != nil || match == nil {
			return nil, apperror.NotFound("BRACKET_MATCH")
		}
		if match.TournamentID != tournamentID {
			return nil, apperror.BusinessRule("MATCH_TOURNAMENT_MISMATCH", "Match tidak termasuk dalam tournament ini")
		}
		if (match.TeamAID == nil || *match.TeamAID != teamID) &&
			(match.TeamBID == nil || *match.TeamBID != teamID) {
			return nil, apperror.BusinessRule("INVALID_TEAM", "Tim bukan peserta match ini")
		}
	}
	if brLobbyID != nil {
		lobby, lobbyErr := s.brLobbyRepo.FindByID(ctx, *brLobbyID)
		if lobbyErr != nil || lobby == nil {
			return nil, apperror.NotFound("BR_LOBBY")
		}
		if lobby.TournamentID != tournamentID {
			return nil, apperror.BusinessRule("MATCH_TOURNAMENT_MISMATCH", "Lobby tidak termasuk dalam tournament ini")
		}
		lobbyTeams, ltErr := s.brLobbyTeamRepo.FindByLobby(ctx, *brLobbyID)
		if ltErr == nil && lobbyTeams != nil {
			found := false
			for _, lt := range lobbyTeams {
				if lt.TeamID == teamID {
					found = true
					break
				}
			}
			if !found {
				return nil, apperror.BusinessRule("INVALID_TEAM", "Tim bukan peserta lobby ini")
			}
		}
	}
	if groupMatchID != nil {
		gMatch, gmErr := s.groupRepo.FindMatchByID(ctx, *groupMatchID)
		if gmErr != nil || gMatch == nil {
			return nil, apperror.NotFound("GROUP_MATCH")
		}
		group, grpErr := s.groupRepo.FindGroupByID(ctx, gMatch.GroupID)
		if grpErr != nil || group == nil {
			return nil, apperror.NotFound("GROUP")
		}
		if group.TournamentID != tournamentID {
			return nil, apperror.BusinessRule("MATCH_TOURNAMENT_MISMATCH", "Group match tidak termasuk dalam tournament ini")
		}
		if (gMatch.TeamAID == nil || *gMatch.TeamAID != teamID) &&
			(gMatch.TeamBID == nil || *gMatch.TeamBID != teamID) {
			return nil, apperror.BusinessRule("INVALID_TEAM", "Tim bukan peserta group match ini")
		}
	}

	// Lookup penalty config for this tournament + card type
	config, err := s.configRepo.FindByTournamentAndType(ctx, tournamentID, cardType)
	if err != nil {
		return nil, apperror.Wrap(err, "lookup penalty config")
	}

	pointDeduction := 0
	if config != nil {
		pointDeduction = config.PointDeduction
	}

	card := &model.MatchCard{
		ID:             uuid.New(),
		TournamentID:   tournamentID,
		TeamID:         teamID,
		IssuedBy:       refereeID,
		CardType:       cardType,
		PointDeduction: pointDeduction,
		Reason:         reason,
		BracketMatchID: bracketMatchID,
		BRLobbyID:      brLobbyID,
		GroupMatchID:   groupMatchID,
		IsRevoked:      false,
		CreatedAt:      time.Now(),
	}

	if err := s.cardRepo.Create(ctx, card); err != nil {
		return nil, apperror.Wrap(err, "create card")
	}

	// Apply penalty points to standings
	if card.PointDeduction > 0 {
		standing, standErr := s.standingsRepo.FindByTournamentAndTeam(ctx, card.TournamentID, card.TeamID)
		if standErr == nil && standing != nil {
			standing.PenaltyPoints += card.PointDeduction
			if updateErr := s.standingsRepo.Update(ctx, standing); updateErr != nil {
				slog.Error("failed to apply card penalty to standings", "card_id", card.ID, "error", updateErr)
			}
		}
	}

	// Check if this card triggers disqualification
	if config != nil && config.IsDisqualification {
		standing, standErr := s.standingsRepo.FindByTournamentAndTeam(ctx, card.TournamentID, card.TeamID)
		if standErr == nil && standing != nil {
			standing.IsEliminated = true
			if updateErr := s.standingsRepo.Update(ctx, standing); updateErr != nil {
				slog.Error("failed to disqualify team", "card_id", card.ID, "error", updateErr)
			}
		}
	}

	// Broadcast card event via WebSocket
	s.broadcastCardEvent(tournamentID, card, "card_issued")

	return card, nil
}

// RevokeCard soft-revokes a match card.
func (s *RefereeService) RevokeCard(ctx context.Context, adminID, cardID uuid.UUID) error {
	card, err := s.cardRepo.FindByID(ctx, cardID)
	if err != nil || card == nil {
		return apperror.NotFound("CARD")
	}
	if card.IsRevoked {
		return apperror.BusinessRule("ALREADY_REVOKED", "Kartu sudah dicabut")
	}

	if err := s.cardRepo.Revoke(ctx, cardID, adminID); err != nil {
		return apperror.Wrap(err, "revoke card")
	}

	// Restore penalty points to standings
	if card.PointDeduction > 0 {
		standing, standErr := s.standingsRepo.FindByTournamentAndTeam(ctx, card.TournamentID, card.TeamID)
		if standErr == nil && standing != nil {
			standing.PenaltyPoints -= card.PointDeduction
			if standing.PenaltyPoints < 0 {
				standing.PenaltyPoints = 0
			}
			// Un-eliminate team if no other active disqualification cards remain
			if standing.IsEliminated {
				allCards, listErr := s.cardRepo.ListByTeam(ctx, card.TeamID)
				if listErr == nil {
					hasActiveDisqualification := false
					for _, c := range allCards {
						if c.ID == card.ID || c.IsRevoked || c.TournamentID != card.TournamentID {
							continue
						}
						cfg, _ := s.configRepo.FindByTournamentAndType(ctx, card.TournamentID, c.CardType)
						if cfg != nil && cfg.IsDisqualification {
							hasActiveDisqualification = true
							break
						}
					}
					if !hasActiveDisqualification {
						standing.IsEliminated = false
					}
				}
			}
			if updateErr := s.standingsRepo.Update(ctx, standing); updateErr != nil {
				slog.Error("failed to restore card penalty", "card_id", card.ID, "error", updateErr)
			}
		}
	}

	// Broadcast revoke event
	s.broadcastCardEvent(card.TournamentID, card, "card_revoked")

	return nil
}

// SetMatchLive updates a match status to "live". No assignment required.
func (s *RefereeService) SetMatchLive(ctx context.Context, refereeID uuid.UUID, matchType string, matchID uuid.UUID) error {
	switch matchType {
	case "bracket":
		return s.bracketRepo.UpdateStatus(ctx, matchID, "live")
	case "br":
		return s.brLobbyRepo.UpdateStatus(ctx, matchID, "live")
	case "group":
		return s.groupRepo.UpdateMatchStatus(ctx, matchID, "live")
	default:
		return apperror.BusinessRule("INVALID_MATCH_TYPE", "Tipe pertandingan tidak valid")
	}
}

// GetScheduledMatches returns all scheduled (not yet live) matches across all match types.
func (s *RefereeService) GetScheduledMatches(ctx context.Context) ([]*model.LiveMatch, error) {
	var scheduled []*model.LiveMatch

	tournamentNames := map[uuid.UUID]string{}
	getTournamentName := func(id uuid.UUID) string {
		if name, ok := tournamentNames[id]; ok {
			return name
		}
		t, err := s.tournamentRepo.FindByID(ctx, id)
		if err != nil || t == nil {
			return ""
		}
		tournamentNames[id] = t.Name
		return t.Name
	}

	// Bracket scheduled
	bracketMatches, err := s.bracketRepo.FindScheduledAcrossAllTournaments(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "get scheduled bracket matches")
	}
	for _, m := range bracketMatches {
		lm := &model.LiveMatch{
			Type:           "bracket",
			MatchID:        m.ID,
			TournamentID:   m.TournamentID,
			TournamentName: getTournamentName(m.TournamentID),
			Status:         m.Status,
			Round:          &m.Round,
			MatchNumber:    &m.MatchNumber,
			TeamAName:      "TBD",
			TeamBName:      "TBD",
		}
		if m.TeamAID != nil {
			lm.TeamAID = m.TeamAID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamAID); tErr == nil && team != nil {
				lm.TeamAName = team.Name
			}
		}
		if m.TeamBID != nil {
			lm.TeamBID = m.TeamBID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamBID); tErr == nil && team != nil {
				lm.TeamBName = team.Name
			}
		}
		scheduled = append(scheduled, lm)
	}

	// BR scheduled lobbies
	brLobbies, err := s.brLobbyRepo.FindScheduledAcrossAllTournaments(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "get scheduled BR lobbies")
	}
	for _, l := range brLobbies {
		lm := &model.LiveMatch{
			Type:           "br",
			MatchID:        l.ID,
			TournamentID:   l.TournamentID,
			TournamentName: getTournamentName(l.TournamentID),
			Status:         l.Status,
			LobbyName:      &l.LobbyName,
			TeamAName:      l.LobbyName,
			TeamBName:      "Battle Royale",
		}
		scheduled = append(scheduled, lm)
	}

	// Group scheduled matches
	groupMatches, err := s.groupRepo.FindScheduledMatches(ctx, 100)
	if err != nil {
		return nil, apperror.Wrap(err, "get scheduled group matches")
	}
	for _, m := range groupMatches {
		group, grpErr := s.groupRepo.FindGroupByID(ctx, m.GroupID)
		if grpErr != nil || group == nil {
			continue
		}
		lm := &model.LiveMatch{
			Type:           "group",
			MatchID:        m.ID,
			TournamentID:   group.TournamentID,
			TournamentName: getTournamentName(group.TournamentID),
			Status:         m.Status,
			Round:          &m.Round,
			MatchNumber:    &m.MatchNumber,
			TeamAName:      "TBD",
			TeamBName:      "TBD",
		}
		if m.TeamAID != nil {
			lm.TeamAID = m.TeamAID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamAID); tErr == nil && team != nil {
				lm.TeamAName = team.Name
			}
		}
		if m.TeamBID != nil {
			lm.TeamBID = m.TeamBID
			if team, tErr := s.teamRepo.FindByID(ctx, *m.TeamBID); tErr == nil && team != nil {
				lm.TeamBName = team.Name
			}
		}
		scheduled = append(scheduled, lm)
	}

	return scheduled, nil
}

// GetTournamentCards returns all cards for a tournament.
func (s *RefereeService) GetTournamentCards(ctx context.Context, tournamentID uuid.UUID) ([]*model.MatchCard, error) {
	cards, err := s.cardRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list tournament cards")
	}
	return cards, nil
}

// GetCardsByTeam returns all cards for a specific team.
func (s *RefereeService) GetCardsByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.MatchCard, error) {
	cards, err := s.cardRepo.ListByTeam(ctx, teamID)
	if err != nil {
		return nil, apperror.Wrap(err, "list team cards")
	}
	return cards, nil
}

// GetCardsByReferee returns all cards issued by a specific referee.
func (s *RefereeService) GetCardsByReferee(ctx context.Context, refereeID uuid.UUID) ([]*model.MatchCard, error) {
	cards, err := s.cardRepo.ListByIssuedBy(ctx, refereeID)
	if err != nil {
		return nil, apperror.Wrap(err, "list referee cards")
	}
	return cards, nil
}

// GetPenaltyConfig returns penalty configs for a tournament.
func (s *RefereeService) GetPenaltyConfig(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentPenaltyConfig, error) {
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	configs, err := s.configRepo.FindByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "get penalty config")
	}
	return configs, nil
}

// UpdatePenaltyConfig upserts penalty configs for a tournament.
func (s *RefereeService) UpdatePenaltyConfig(ctx context.Context, tournamentID uuid.UUID, configs []*model.TournamentPenaltyConfig) error {
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return apperror.NotFound("TOURNAMENT")
	}

	for _, c := range configs {
		c.TournamentID = tournamentID
		if c.ID == uuid.Nil {
			c.ID = uuid.New()
		}
		if err := s.configRepo.Upsert(ctx, c); err != nil {
			return apperror.Wrap(err, "upsert penalty config")
		}
	}
	return nil
}

// AssignReferee creates a referee assignment to a match (kept for backward compat).
func (s *RefereeService) AssignReferee(ctx context.Context, refereeID, tournamentID uuid.UUID, matchType string, matchID uuid.UUID) (*model.RefereeAssignment, error) {
	switch matchType {
	case "bracket":
		match, err := s.bracketRepo.FindByID(ctx, matchID)
		if err != nil || match == nil {
			return nil, apperror.NotFound("BRACKET_MATCH")
		}
		if match.TournamentID != tournamentID {
			return nil, apperror.BusinessRule("MATCH_TOURNAMENT_MISMATCH", "Match tidak termasuk dalam tournament ini")
		}
	case "br":
		lobby, err := s.brLobbyRepo.FindByID(ctx, matchID)
		if err != nil || lobby == nil {
			return nil, apperror.NotFound("BR_LOBBY")
		}
		if lobby.TournamentID != tournamentID {
			return nil, apperror.BusinessRule("MATCH_TOURNAMENT_MISMATCH", "Lobby tidak termasuk dalam tournament ini")
		}
	case "group":
		gMatch, err := s.groupRepo.FindMatchByID(ctx, matchID)
		if err != nil || gMatch == nil {
			return nil, apperror.NotFound("GROUP_MATCH")
		}
		group, grpErr := s.groupRepo.FindGroupByID(ctx, gMatch.GroupID)
		if grpErr != nil || group == nil {
			return nil, apperror.NotFound("GROUP")
		}
		if group.TournamentID != tournamentID {
			return nil, apperror.BusinessRule("MATCH_TOURNAMENT_MISMATCH", "Group match tidak termasuk dalam tournament ini")
		}
	default:
		return nil, apperror.BusinessRule("INVALID_MATCH_TYPE", "Tipe pertandingan tidak valid")
	}

	a := &model.RefereeAssignment{
		ID:           uuid.New(),
		RefereeID:    refereeID,
		TournamentID: tournamentID,
		AssignedAt:   time.Now(),
	}

	switch matchType {
	case "bracket":
		a.BracketMatchID = &matchID
	case "br":
		a.BRLobbyID = &matchID
	case "group":
		a.GroupMatchID = &matchID
	}

	if err := s.assignmentRepo.Create(ctx, a); err != nil {
		return nil, apperror.Wrap(err, "create assignment")
	}
	return a, nil
}

// UnassignReferee deletes a referee assignment.
func (s *RefereeService) UnassignReferee(ctx context.Context, assignmentID uuid.UUID) error {
	if err := s.assignmentRepo.Delete(ctx, assignmentID); err != nil {
		return apperror.Wrap(err, "delete assignment")
	}
	return nil
}

func (s *RefereeService) broadcastCardEvent(tournamentID uuid.UUID, card *model.MatchCard, eventType string) {
	payload, err := json.Marshal(map[string]interface{}{
		"type":          eventType,
		"card_id":       card.ID,
		"tournament_id": tournamentID,
		"team_id":       card.TeamID,
		"card_type":     card.CardType,
		"reason":        card.Reason,
	})
	if err != nil {
		slog.Error("failed to marshal card event", "error", err)
		return
	}
	room := fmt.Sprintf("tournament:%s", tournamentID.String())
	s.hub.BroadcastToRoom(room, payload)
}
