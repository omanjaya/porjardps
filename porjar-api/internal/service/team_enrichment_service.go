package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ── Enriched Team DTO ─────────────────────────────────────────────────────────

type TeamGameInfo struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type TeamSchoolInfo struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Level   string  `json:"level"`
	LogoURL *string `json:"logo_url"`
}

type TeamCaptainInfo struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
}

type EnrichedTeamMember struct {
	ID         string  `json:"id"`
	FullName   string  `json:"full_name"`
	InGameName string  `json:"in_game_name"`
	InGameID   *string `json:"in_game_id"`
	Role       string  `json:"role"`
}

type EnrichedTeam struct {
	ID          string               `json:"id"`
	Name        string               `json:"name"`
	Status      string               `json:"status"`
	Seed        *int                 `json:"seed"`
	LogoURL     *string              `json:"logo_url"`
	Game        TeamGameInfo         `json:"game"`
	School      *TeamSchoolInfo      `json:"school"`
	Captain     *TeamCaptainInfo     `json:"captain"`
	MemberCount int                  `json:"member_count"`
	CreatedAt   string               `json:"created_at,omitempty"`
	Members     []EnrichedTeamMember `json:"members"`
}

// enrichTeam converts a raw model.Team to EnrichedTeam with nested objects.
func (s *TeamService) enrichTeam(ctx context.Context, t *model.Team) *EnrichedTeam {
	game := TeamGameInfo{ID: t.GameID.String()}
	if s.gameRepo != nil {
		if g, err := s.gameRepo.FindByID(ctx, t.GameID); err == nil && g != nil {
			game = TeamGameInfo{ID: g.ID.String(), Slug: g.Slug, Name: g.Name}
		}
	}

	var school *TeamSchoolInfo
	if t.SchoolID != nil && s.schoolRepo != nil {
		if sc, err := s.schoolRepo.FindByID(ctx, *t.SchoolID); err == nil && sc != nil {
			school = &TeamSchoolInfo{ID: sc.ID.String(), Name: sc.Name, Level: sc.Level, LogoURL: sc.LogoURL}
		}
	}

	var captain *TeamCaptainInfo
	if t.CaptainUserID != nil && s.userRepo != nil {
		if u, err := s.userRepo.FindByID(ctx, *t.CaptainUserID); err == nil && u != nil {
			captain = &TeamCaptainInfo{ID: u.ID.String(), FullName: u.FullName}
		}
	}

	memberCount := 0
	if cnt, err := s.teamMemberRepo.CountByTeam(ctx, t.ID); err == nil {
		memberCount = cnt
	}

	return &EnrichedTeam{
		ID:          t.ID.String(),
		Name:        t.Name,
		Status:      t.Status,
		Seed:        t.Seed,
		LogoURL:     t.LogoURL,
		Game:        game,
		School:      school,
		Captain:     captain,
		MemberCount: memberCount,
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
	}
}

// ListEnriched returns enriched team data with nested game/school/captain/member_count.
// Uses batch queries to avoid N+1 problems.
func (s *TeamService) ListEnriched(ctx context.Context, filter model.TeamFilter) ([]*EnrichedTeam, int, error) {
	teams, total, err := s.teamRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list teams")
	}
	if len(teams) == 0 {
		return []*EnrichedTeam{}, total, nil
	}

	// Collect unique IDs
	gameIDSet := make(map[uuid.UUID]struct{})
	schoolIDSet := make(map[uuid.UUID]struct{})
	captainIDSet := make(map[uuid.UUID]struct{})
	teamIDs := make([]uuid.UUID, 0, len(teams))
	for _, t := range teams {
		gameIDSet[t.GameID] = struct{}{}
		if t.SchoolID != nil {
			schoolIDSet[*t.SchoolID] = struct{}{}
		}
		if t.CaptainUserID != nil {
			captainIDSet[*t.CaptainUserID] = struct{}{}
		}
		teamIDs = append(teamIDs, t.ID)
	}

	// Batch fetch games
	gameMap := make(map[uuid.UUID]*model.Game)
	if s.gameRepo != nil && len(gameIDSet) > 0 {
		gameIDs := make([]uuid.UUID, 0, len(gameIDSet))
		for id := range gameIDSet {
			gameIDs = append(gameIDs, id)
		}
		if games, err := s.gameRepo.FindByIDs(ctx, gameIDs); err == nil {
			for _, g := range games {
				gameMap[g.ID] = g
			}
		}
	}

	// Batch fetch schools
	schoolMap := make(map[uuid.UUID]*model.School)
	if s.schoolRepo != nil && len(schoolIDSet) > 0 {
		schoolIDs := make([]uuid.UUID, 0, len(schoolIDSet))
		for id := range schoolIDSet {
			schoolIDs = append(schoolIDs, id)
		}
		if schools, err := s.schoolRepo.FindByIDs(ctx, schoolIDs); err == nil {
			for _, sc := range schools {
				schoolMap[sc.ID] = sc
			}
		}
	}

	// Batch fetch captains
	captainMap := make(map[uuid.UUID]*model.User)
	if s.userRepo != nil && len(captainIDSet) > 0 {
		captainIDs := make([]uuid.UUID, 0, len(captainIDSet))
		for id := range captainIDSet {
			captainIDs = append(captainIDs, id)
		}
		if users, err := s.userRepo.FindByIDs(ctx, captainIDs); err == nil {
			for _, u := range users {
				captainMap[u.ID] = u
			}
		}
	}

	// Batch fetch member counts
	memberCountMap := make(map[uuid.UUID]int)
	if counts, err := s.teamMemberRepo.CountByTeams(ctx, teamIDs); err == nil {
		memberCountMap = counts
	}

	// Build enriched teams from maps
	enriched := make([]*EnrichedTeam, 0, len(teams))
	for _, t := range teams {
		game := TeamGameInfo{ID: t.GameID.String()}
		if g, ok := gameMap[t.GameID]; ok {
			game = TeamGameInfo{ID: g.ID.String(), Slug: g.Slug, Name: g.Name}
		}

		var school *TeamSchoolInfo
		if t.SchoolID != nil {
			if sc, ok := schoolMap[*t.SchoolID]; ok {
				school = &TeamSchoolInfo{ID: sc.ID.String(), Name: sc.Name, Level: sc.Level, LogoURL: sc.LogoURL}
			}
		}

		var captain *TeamCaptainInfo
		if t.CaptainUserID != nil {
			if u, ok := captainMap[*t.CaptainUserID]; ok {
				captain = &TeamCaptainInfo{ID: u.ID.String(), FullName: u.FullName}
			}
		}

		enriched = append(enriched, &EnrichedTeam{
			ID:          t.ID.String(),
			Name:        t.Name,
			Status:      t.Status,
			Seed:        t.Seed,
			LogoURL:     t.LogoURL,
			Game:        game,
			School:      school,
			Captain:     captain,
			MemberCount: memberCountMap[t.ID],
			CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		})
	}
	return enriched, total, nil
}

// GetMyTeamsEnriched returns enriched teams the user is a member of.
// Uses batch queries to avoid N+1 problems.
func (s *TeamService) GetMyTeamsEnriched(ctx context.Context, userID uuid.UUID) ([]*EnrichedTeam, error) {
	memberships, err := s.teamMemberRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "find user memberships")
	}
	if len(memberships) == 0 {
		return []*EnrichedTeam{}, nil
	}

	// Collect all team IDs from memberships
	teamIDs := make([]uuid.UUID, 0, len(memberships))
	for _, m := range memberships {
		teamIDs = append(teamIDs, m.TeamID)
	}

	// Batch fetch all teams in one query
	teams, err := s.teamRepo.FindByIDs(ctx, teamIDs)
	if err != nil {
		return nil, apperror.Wrap(err, "batch fetch teams")
	}

	// Build team map for O(1) lookup
	teamMap := make(map[uuid.UUID]*model.Team, len(teams))
	for _, t := range teams {
		teamMap[t.ID] = t
	}

	// Collect unique IDs for batch enrichment lookups
	gameIDSet := make(map[uuid.UUID]struct{})
	schoolIDSet := make(map[uuid.UUID]struct{})
	captainIDSet := make(map[uuid.UUID]struct{})
	validTeams := make([]*model.Team, 0, len(memberships))
	for _, m := range memberships {
		t, ok := teamMap[m.TeamID]
		if !ok {
			continue
		}
		validTeams = append(validTeams, t)
		gameIDSet[t.GameID] = struct{}{}
		if t.SchoolID != nil {
			schoolIDSet[*t.SchoolID] = struct{}{}
		}
		if t.CaptainUserID != nil {
			captainIDSet[*t.CaptainUserID] = struct{}{}
		}
	}

	// Batch fetch games
	gameMap := make(map[uuid.UUID]*model.Game)
	if s.gameRepo != nil && len(gameIDSet) > 0 {
		gameIDs := make([]uuid.UUID, 0, len(gameIDSet))
		for id := range gameIDSet {
			gameIDs = append(gameIDs, id)
		}
		if games, err := s.gameRepo.FindByIDs(ctx, gameIDs); err == nil {
			for _, g := range games {
				gameMap[g.ID] = g
			}
		}
	}

	// Batch fetch schools
	schoolMap := make(map[uuid.UUID]*model.School)
	if s.schoolRepo != nil && len(schoolIDSet) > 0 {
		schoolIDs := make([]uuid.UUID, 0, len(schoolIDSet))
		for id := range schoolIDSet {
			schoolIDs = append(schoolIDs, id)
		}
		if schools, err := s.schoolRepo.FindByIDs(ctx, schoolIDs); err == nil {
			for _, sc := range schools {
				schoolMap[sc.ID] = sc
			}
		}
	}

	// Batch fetch captains
	captainMap := make(map[uuid.UUID]*model.User)
	if s.userRepo != nil && len(captainIDSet) > 0 {
		captainIDs := make([]uuid.UUID, 0, len(captainIDSet))
		for id := range captainIDSet {
			captainIDs = append(captainIDs, id)
		}
		if users, err := s.userRepo.FindByIDs(ctx, captainIDs); err == nil {
			for _, u := range users {
				captainMap[u.ID] = u
			}
		}
	}

	// Batch fetch member counts
	memberCountMap := make(map[uuid.UUID]int)
	if counts, err := s.teamMemberRepo.CountByTeams(ctx, teamIDs); err == nil {
		memberCountMap = counts
	}

	// Build enriched teams from maps (preserving membership order)
	enriched := make([]*EnrichedTeam, 0, len(validTeams))
	for _, t := range validTeams {
		game := TeamGameInfo{ID: t.GameID.String()}
		if g, ok := gameMap[t.GameID]; ok {
			game = TeamGameInfo{ID: g.ID.String(), Slug: g.Slug, Name: g.Name}
		}

		var school *TeamSchoolInfo
		if t.SchoolID != nil {
			if sc, ok := schoolMap[*t.SchoolID]; ok {
				school = &TeamSchoolInfo{ID: sc.ID.String(), Name: sc.Name, Level: sc.Level, LogoURL: sc.LogoURL}
			}
		}

		var captain *TeamCaptainInfo
		if t.CaptainUserID != nil {
			if u, ok := captainMap[*t.CaptainUserID]; ok {
				captain = &TeamCaptainInfo{ID: u.ID.String(), FullName: u.FullName}
			}
		}

		enriched = append(enriched, &EnrichedTeam{
			ID:          t.ID.String(),
			Name:        t.Name,
			Status:      t.Status,
			Seed:        t.Seed,
			LogoURL:     t.LogoURL,
			Game:        game,
			School:      school,
			Captain:     captain,
			MemberCount: memberCountMap[t.ID],
			CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		})
	}
	return enriched, nil
}
