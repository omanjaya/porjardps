package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// ──────────────────────────────────────────────
// Report Data Structures
// ──────────────────────────────────────────────

type TournamentReport struct {
	GeneratedAt time.Time           `json:"generated_at"`
	Tournament  TournamentInfo      `json:"tournament"`
	Teams       []ReportTeam        `json:"teams"`
	Matches     []ReportMatch       `json:"matches"`
	Lobbies     []ReportLobby       `json:"lobbies"`
	Standings   []ReportStanding    `json:"standings"`
	TopPlayers  TopPlayersSection   `json:"top_players"`
	Statistics  ReportStatistics    `json:"statistics"`
}

type TournamentInfo struct {
	ID                uuid.UUID  `json:"id"`
	Name              string     `json:"name"`
	GameName          string     `json:"game_name"`
	GameSlug          string     `json:"game_slug"`
	Format            string     `json:"format"`
	Stage             string     `json:"stage"`
	BestOf            int        `json:"best_of"`
	Status            string     `json:"status"`
	MaxTeams          *int       `json:"max_teams"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	RegistrationStart *time.Time `json:"registration_start"`
	RegistrationEnd   *time.Time `json:"registration_end"`
}

type ReportTeam struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Seed     *int      `json:"seed"`
	LogoURL  *string   `json:"logo_url"`
	Status   string    `json:"status"`
	School   *string   `json:"school"`
}

type ReportMatch struct {
	ID          uuid.UUID  `json:"id"`
	Round       int        `json:"round"`
	MatchNumber int        `json:"match_number"`
	TeamAName   *string    `json:"team_a_name"`
	TeamBName   *string    `json:"team_b_name"`
	WinnerName  *string    `json:"winner_name"`
	ScoreA      *int       `json:"score_a"`
	ScoreB      *int       `json:"score_b"`
	Status      string     `json:"status"`
	CompletedAt *time.Time `json:"completed_at"`
	Position    *string    `json:"bracket_position"`
}

type ReportLobby struct {
	ID          uuid.UUID           `json:"id"`
	LobbyName   string              `json:"lobby_name"`
	LobbyNumber int                 `json:"lobby_number"`
	DayNumber   int                 `json:"day_number"`
	Status      string              `json:"status"`
	Results     []ReportLobbyResult `json:"results"`
}

type ReportLobbyResult struct {
	TeamName        string `json:"team_name"`
	Placement       int    `json:"placement"`
	Kills           int    `json:"kills"`
	PlacementPoints int    `json:"placement_points"`
	KillPoints      int    `json:"kill_points"`
	TotalPoints     int    `json:"total_points"`
}

type ReportStanding struct {
	RankPosition         *int     `json:"rank_position"`
	TeamName             string   `json:"team_name"`
	MatchesPlayed        int      `json:"matches_played"`
	Wins                 int      `json:"wins"`
	Losses               int      `json:"losses"`
	Draws                int      `json:"draws"`
	TotalPoints          int      `json:"total_points"`
	TotalKills           int      `json:"total_kills"`
	TotalPlacementPoints int      `json:"total_placement_points"`
	BestPlacement        *int     `json:"best_placement"`
	AvgPlacement         *float64 `json:"avg_placement"`
	IsEliminated         bool     `json:"is_eliminated"`
}

type TopPlayersSection struct {
	MostMVPs  []PlayerStat `json:"most_mvps"`
	MostKills []PlayerStat `json:"most_kills"`
}

type PlayerStat struct {
	PlayerName string `json:"player_name"`
	TeamName   string `json:"team_name"`
	Value      int    `json:"value"`
}

type ReportStatistics struct {
	TotalTeams        int     `json:"total_teams"`
	TotalMatches      int     `json:"total_matches"`
	CompletedMatches  int     `json:"completed_matches"`
	TotalLobbies      int     `json:"total_lobbies"`
	CompletedLobbies  int     `json:"completed_lobbies"`
	TotalGamesPlayed  int     `json:"total_games_played"`
	AvgDurationMins   float64 `json:"avg_duration_mins"`
}

// ──────────────────────────────────────────────
// Report Service
// ──────────────────────────────────────────────

type ReportService struct {
	tournamentRepo     model.TournamentRepository
	tournamentTeamRepo model.TournamentTeamRepository
	teamRepo           model.TeamRepository
	bracketRepo        model.BracketRepository
	matchGameRepo      model.MatchGameRepository
	standingsRepo      model.StandingsRepository
	brLobbyRepo        model.BRLobbyRepository
	brResultRepo       model.BRLobbyResultRepository
	gameRepo           model.GameRepository
	schoolRepo         model.SchoolRepository
}

func NewReportService(
	tournamentRepo model.TournamentRepository,
	tournamentTeamRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
	bracketRepo model.BracketRepository,
	matchGameRepo model.MatchGameRepository,
	standingsRepo model.StandingsRepository,
	brLobbyRepo model.BRLobbyRepository,
	brResultRepo model.BRLobbyResultRepository,
	gameRepo model.GameRepository,
	schoolRepo model.SchoolRepository,
) *ReportService {
	return &ReportService{
		tournamentRepo:     tournamentRepo,
		tournamentTeamRepo: tournamentTeamRepo,
		teamRepo:           teamRepo,
		bracketRepo:        bracketRepo,
		matchGameRepo:      matchGameRepo,
		standingsRepo:      standingsRepo,
		brLobbyRepo:        brLobbyRepo,
		brResultRepo:       brResultRepo,
		gameRepo:           gameRepo,
		schoolRepo:         schoolRepo,
	}
}

func (s *ReportService) GenerateTournamentReport(ctx context.Context, tournamentID uuid.UUID) (*TournamentReport, error) {
	// 1. Get tournament
	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("find tournament: %w", err)
	}
	if tournament == nil {
		return nil, fmt.Errorf("tournament not found")
	}

	// 2. Get game info
	game, err := s.gameRepo.FindByID(ctx, tournament.GameID)
	if err != nil {
		return nil, fmt.Errorf("find game: %w", err)
	}

	info := TournamentInfo{
		ID:                tournament.ID,
		Name:              tournament.Name,
		Format:            tournament.Format,
		Stage:             tournament.Stage,
		BestOf:            tournament.BestOf,
		Status:            tournament.Status,
		MaxTeams:          tournament.MaxTeams,
		StartDate:         tournament.StartDate,
		EndDate:           tournament.EndDate,
		RegistrationStart: tournament.RegistrationStart,
		RegistrationEnd:   tournament.RegistrationEnd,
	}
	if game != nil {
		info.GameName = game.Name
		info.GameSlug = game.Slug
	}

	// 3. Get registered teams
	tournamentTeams, err := s.tournamentTeamRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("list tournament teams: %w", err)
	}

	// Build a team ID -> team name lookup
	teamMap := make(map[uuid.UUID]*model.Team)
	var reportTeams []ReportTeam
	for _, tt := range tournamentTeams {
		team, err := s.teamRepo.FindByID(ctx, tt.TeamID)
		if err != nil || team == nil {
			continue
		}
		teamMap[team.ID] = team

		rt := ReportTeam{
			ID:      team.ID,
			Name:    team.Name,
			Seed:    tt.Seed,
			LogoURL: team.LogoURL,
			Status:  tt.Status,
		}

		// Get school name if available
		if team.SchoolID != nil {
			school, err := s.schoolRepo.FindByID(ctx, *team.SchoolID)
			if err == nil && school != nil {
				rt.School = &school.Name
			}
		}

		reportTeams = append(reportTeams, rt)
	}

	teamName := func(id *uuid.UUID) *string {
		if id == nil {
			return nil
		}
		if t, ok := teamMap[*id]; ok {
			return &t.Name
		}
		return nil
	}

	// 4. Get bracket matches
	matches, err := s.bracketRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("list bracket matches: %w", err)
	}

	var reportMatches []ReportMatch
	totalGames := 0
	totalDurationMins := 0
	gameCount := 0
	completedMatches := 0

	for _, m := range matches {
		rm := ReportMatch{
			ID:          m.ID,
			Round:       m.Round,
			MatchNumber: m.MatchNumber,
			TeamAName:   teamName(m.TeamAID),
			TeamBName:   teamName(m.TeamBID),
			WinnerName:  teamName(m.WinnerID),
			ScoreA:      m.ScoreA,
			ScoreB:      m.ScoreB,
			Status:      m.Status,
			CompletedAt: m.CompletedAt,
			Position:    m.BracketPosition,
		}
		reportMatches = append(reportMatches, rm)

		if m.Status == "completed" {
			completedMatches++
		}

		// Get match games for stats
		games, err := s.matchGameRepo.ListByMatch(ctx, m.ID)
		if err == nil {
			totalGames += len(games)
			for _, g := range games {
				if g.DurationMinutes != nil {
					totalDurationMins += *g.DurationMinutes
					gameCount++
				}
			}
		}
	}

	// 5. Get BR lobbies
	lobbies, err := s.brLobbyRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("list lobbies: %w", err)
	}

	var reportLobbies []ReportLobby
	completedLobbies := 0
	for _, l := range lobbies {
		rl := ReportLobby{
			ID:          l.ID,
			LobbyName:   l.LobbyName,
			LobbyNumber: l.LobbyNumber,
			DayNumber:   l.DayNumber,
			Status:      l.Status,
		}
		if l.Status == "completed" {
			completedLobbies++
		}

		results, err := s.brResultRepo.ListByLobby(ctx, l.ID)
		if err == nil {
			for _, r := range results {
				tn := ""
				if t, ok := teamMap[r.TeamID]; ok {
					tn = t.Name
				}
				rl.Results = append(rl.Results, ReportLobbyResult{
					TeamName:        tn,
					Placement:       r.Placement,
					Kills:           r.Kills,
					PlacementPoints: r.PlacementPoints,
					KillPoints:      r.KillPoints,
					TotalPoints:     r.TotalPoints,
				})
			}
		}
		reportLobbies = append(reportLobbies, rl)
	}

	// 6. Get standings
	standings, err := s.standingsRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("list standings: %w", err)
	}

	var reportStandings []ReportStanding
	for _, st := range standings {
		tn := ""
		if t, ok := teamMap[st.TeamID]; ok {
			tn = t.Name
		}
		reportStandings = append(reportStandings, ReportStanding{
			RankPosition:         st.RankPosition,
			TeamName:             tn,
			MatchesPlayed:        st.MatchesPlayed,
			Wins:                 st.Wins,
			Losses:               st.Losses,
			Draws:                st.Draws,
			TotalPoints:          st.TotalPoints,
			TotalKills:           st.TotalKills,
			TotalPlacementPoints: st.TotalPlacementPoints,
			BestPlacement:        st.BestPlacement,
			AvgPlacement:         st.AvgPlacement,
			IsEliminated:         st.IsEliminated,
		})
	}

	// 7. Compute top players (MVP & kills — using match_games)
	// For MVP: count how many times a user was selected as mvp_user_id
	// This is a simplified approach; a full implementation would query the DB
	topPlayers := TopPlayersSection{
		MostMVPs:  []PlayerStat{},
		MostKills: []PlayerStat{},
	}

	// 8. Compute stats
	avgDuration := 0.0
	if gameCount > 0 {
		avgDuration = float64(totalDurationMins) / float64(gameCount)
	}

	stats := ReportStatistics{
		TotalTeams:       len(reportTeams),
		TotalMatches:     len(reportMatches),
		CompletedMatches: completedMatches,
		TotalLobbies:     len(reportLobbies),
		CompletedLobbies: completedLobbies,
		TotalGamesPlayed: totalGames,
		AvgDurationMins:  avgDuration,
	}

	// Ensure nil slices become empty arrays
	if reportTeams == nil {
		reportTeams = []ReportTeam{}
	}
	if reportMatches == nil {
		reportMatches = []ReportMatch{}
	}
	if reportLobbies == nil {
		reportLobbies = []ReportLobby{}
	}
	if reportStandings == nil {
		reportStandings = []ReportStanding{}
	}

	report := &TournamentReport{
		GeneratedAt: time.Now(),
		Tournament:  info,
		Teams:       reportTeams,
		Matches:     reportMatches,
		Lobbies:     reportLobbies,
		Standings:   reportStandings,
		TopPlayers:  topPlayers,
		Statistics:  stats,
	}

	return report, nil
}
