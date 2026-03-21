package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
)

type TeamService struct {
	db             *pgxpool.Pool
	teamRepo       model.TeamRepository
	teamMemberRepo model.TeamMemberRepository
	gameRepo       model.GameRepository
	inviteRepo     model.TeamInviteRepository
	schoolRepo     model.SchoolRepository
	userRepo       model.UserRepository
}

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
	Members     []EnrichedTeamMember `json:"members"`
}

func NewTeamService(
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
	db *pgxpool.Pool,
) *TeamService {
	return &TeamService{
		db:             db,
		teamRepo:       teamRepo,
		teamMemberRepo: teamMemberRepo,
		gameRepo:       gameRepo,
	}
}

// SetInviteRepo sets the invite repository (optional dependency).
func (s *TeamService) SetInviteRepo(repo model.TeamInviteRepository) {
	s.inviteRepo = repo
}

func (s *TeamService) SetSchoolRepo(repo model.SchoolRepository) {
	s.schoolRepo = repo
}

func (s *TeamService) SetUserRepo(repo model.UserRepository) {
	s.userRepo = repo
}

func (s *TeamService) FindGameBySlug(ctx context.Context, slug string) (*model.Game, error) {
	return s.gameRepo.FindBySlug(ctx, slug)
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
		})
	}
	return enriched, nil
}

func (s *TeamService) Create(ctx context.Context, name string, gameID, schoolID, captainUserID uuid.UUID) (*model.Team, error) {
	// Validate game exists
	game, err := s.gameRepo.FindByID(ctx, gameID)
	if err != nil {
		return nil, apperror.NotFound("GAME")
	}
	if game == nil {
		return nil, apperror.NotFound("GAME")
	}

	// Check user not already in a team for this game
	existingTeams, err := s.teamMemberRepo.FindUserTeamsForGame(ctx, captainUserID, gameID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing teams")
	}
	if len(existingTeams) > 0 {
		return nil, apperror.Conflict("PLAYER_ALREADY_IN_GAME_TEAM", "Anda sudah terdaftar di tim lain untuk game ini")
	}

	// Check unique name per game
	existing, err := s.teamRepo.FindByUserAndGame(ctx, captainUserID, gameID)
	if err == nil && existing != nil {
		return nil, apperror.Conflict("TEAM_NAME_EXISTS", "Nama tim sudah digunakan untuk game ini")
	}

	now := time.Now()
	team := &model.Team{
		ID:            uuid.New(),
		Name:          name,
		GameID:        gameID,
		SchoolID:      &schoolID,
		CaptainUserID: &captainUserID,
		Status:        "pending",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Auto-add captain as member
	member := &model.TeamMember{
		ID:         uuid.New(),
		TeamID:     team.ID,
		UserID:     &captainUserID,
		InGameName: "",
		Role:       "captain",
		JoinedAt:   now,
	}

	// Create team + captain member atomically in a single transaction.
	// Falls back to non-transactional calls when db pool is unavailable (e.g. in unit tests).
	if s.db != nil {
		if err := repository.WithTx(ctx, s.db, func(tx pgx.Tx) error {
			if err := s.teamRepo.CreateTx(ctx, tx, team); err != nil {
				return apperror.Wrap(err, "create team")
			}
			if err := s.teamMemberRepo.CreateTx(ctx, tx, member); err != nil {
				return apperror.Wrap(err, "add captain as member")
			}
			return nil
		}); err != nil {
			return nil, err
		}
	} else {
		if err := s.teamRepo.Create(ctx, team); err != nil {
			return nil, apperror.Wrap(err, "create team")
		}
		if err := s.teamMemberRepo.Create(ctx, member); err != nil {
			return nil, apperror.Wrap(err, "add captain as member")
		}
	}

	return team, nil
}

func (s *TeamService) GetByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.NotFound("TEAM")
	}
	if team == nil {
		return nil, apperror.NotFound("TEAM")
	}
	return team, nil
}

func (s *TeamService) GetByIDEnriched(ctx context.Context, id uuid.UUID) (*EnrichedTeam, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}
	enriched := s.enrichTeam(ctx, team)

	// Fetch full member list with user details
	members, err := s.teamMemberRepo.FindByTeam(ctx, id)
	if err == nil && members != nil {
		// Batch fetch all user IDs for members
		userIDSet := make(map[uuid.UUID]struct{})
		for _, m := range members {
			if m.UserID != nil {
				userIDSet[*m.UserID] = struct{}{}
			}
		}
		userMap := make(map[uuid.UUID]*model.User)
		if s.userRepo != nil && len(userIDSet) > 0 {
			userIDs := make([]uuid.UUID, 0, len(userIDSet))
			for uid := range userIDSet {
				userIDs = append(userIDs, uid)
			}
			if users, err := s.userRepo.FindByIDs(ctx, userIDs); err == nil {
				for _, u := range users {
					userMap[u.ID] = u
				}
			}
		}

		for _, m := range members {
			em := EnrichedTeamMember{
				ID:         m.ID.String(),
				InGameName: m.InGameName,
				InGameID:   m.InGameID,
				Role:       m.Role,
			}
			if m.UserID != nil {
				if u, ok := userMap[*m.UserID]; ok {
					em.FullName = u.FullName
				}
			}
			enriched.Members = append(enriched.Members, em)
		}
	}

	return enriched, nil
}

func (s *TeamService) Update(ctx context.Context, id uuid.UUID, name string, logoURL *string, callerUserID uuid.UUID) (*model.Team, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != callerUserID {
		return nil, apperror.New("FORBIDDEN", "Hanya kapten yang bisa mengubah tim", 403)
	}

	if name != "" {
		team.Name = name
	}
	if logoURL != nil {
		team.LogoURL = logoURL
	}
	team.UpdatedAt = time.Now()

	if err := s.teamRepo.Update(ctx, team); err != nil {
		return nil, apperror.Wrap(err, "update team")
	}

	return team, nil
}

func (s *TeamService) List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
	teams, total, err := s.teamRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list teams")
	}
	return teams, total, nil
}

func (s *TeamService) Delete(ctx context.Context, teamID, captainUserID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if team.CaptainUserID == nil || *team.CaptainUserID != captainUserID {
		return apperror.New("FORBIDDEN", "Hanya kapten yang bisa menghapus tim", 403)
	}

	count, err := s.teamRepo.CountActiveTournaments(ctx, teamID)
	if err != nil {
		return apperror.Wrap(err, "check active tournaments")
	}
	if count > 0 {
		return apperror.New("TEAM_HAS_ACTIVE_TOURNAMENTS", "Tim masih terdaftar di turnamen aktif. Selesaikan atau keluar dari turnamen terlebih dahulu.", 409)
	}

	if err := s.teamRepo.Delete(ctx, teamID); err != nil {
		return apperror.Wrap(err, "delete team")
	}
	return nil
}

func (s *TeamService) AdminUpdate(ctx context.Context, id uuid.UUID, name string) (*model.Team, error) {
	team, err := s.teamRepo.FindByID(ctx, id)
	if err != nil || team == nil {
		return nil, apperror.NotFound("TEAM")
	}

	if name != "" {
		team.Name = name
	}
	team.UpdatedAt = time.Now()

	if err := s.teamRepo.Update(ctx, team); err != nil {
		return nil, apperror.Wrap(err, "admin update team")
	}
	return team, nil
}

func (s *TeamService) AdminDelete(ctx context.Context, teamID uuid.UUID) error {
	team, err := s.teamRepo.FindByID(ctx, teamID)
	if err != nil || team == nil {
		return apperror.NotFound("TEAM")
	}

	if err := s.teamRepo.Delete(ctx, teamID); err != nil {
		return apperror.Wrap(err, "admin delete team")
	}
	return nil
}
