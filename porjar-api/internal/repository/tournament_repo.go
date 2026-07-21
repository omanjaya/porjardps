package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// --- TournamentRepository ---

type tournamentRepo struct {
	db *pgxpool.Pool
}

func NewTournamentRepo(db *pgxpool.Pool) model.TournamentRepository {
	return &tournamentRepo{db: db}
}

func (r *tournamentRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Tournament, error) {
	t := &model.Tournament{}
	err := r.db.QueryRow(ctx,
		`SELECT id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'), game_id, name, format, stage, best_of, max_teams, status,
		        registration_start, registration_end, start_date, end_date, rules,
		        COALESCE(kill_point_value, 1.0), COALESCE(wwcd_bonus, 0),
		        qualification_threshold, max_lobby_teams, school_level,
		        TO_CHAR(daily_start_time, 'HH24:MI'),
		        COALESCE(default_num_maps, 1), COALESCE(default_map_names, '{}'),
		        COALESCE(tiebreaker_order, '{wwcd,placement_points,kills,best_placement}'),
		        champion_team_id, champion_team_name, champion_team_logo,
		        prize_pool, prize_description,
		        created_at, updated_at
		 FROM tournaments WHERE id = $1`, id).
		Scan(&t.ID, &t.EventID, &t.GameID, &t.Name, &t.Format, &t.Stage, &t.BestOf, &t.MaxTeams, &t.Status,
			&t.RegistrationStart, &t.RegistrationEnd, &t.StartDate, &t.EndDate, &t.Rules,
			&t.KillPointValue, &t.WWCDBonus,
			&t.QualificationThreshold, &t.MaxLobbyTeams, &t.SchoolLevel,
			&t.DailyStartTime,
			&t.DefaultNumMaps, &t.DefaultMapNames,
			&t.TiebreakerOrder,
			&t.ChampionTeamID, &t.ChampionTeamName, &t.ChampionTeamLogo,
			&t.PrizePool, &t.PrizeDescription,
			&t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return t, nil
}

func (r *tournamentRepo) Create(ctx context.Context, t *model.Tournament) error {
	var dailyStartTime interface{}
	if t.DailyStartTime != nil {
		dailyStartTime = *t.DailyStartTime
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO tournaments (id, event_id, game_id, name, format, stage, best_of, max_teams, status,
		        registration_start, registration_end, start_date, end_date, rules,
		        kill_point_value, wwcd_bonus, qualification_threshold, max_lobby_teams,
		        school_level, daily_start_time, default_num_maps, default_map_names, tiebreaker_order,
		        champion_team_id, champion_team_name, champion_team_logo,
		        prize_pool, prize_description,
		        created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::TIME, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
		t.ID, t.EventID, t.GameID, t.Name, t.Format, t.Stage, t.BestOf, t.MaxTeams, t.Status,
		t.RegistrationStart, t.RegistrationEnd, t.StartDate, t.EndDate, t.Rules,
		t.KillPointValue, t.WWCDBonus, t.QualificationThreshold, t.MaxLobbyTeams,
		t.SchoolLevel, dailyStartTime, t.DefaultNumMaps, t.DefaultMapNames, t.TiebreakerOrder,
		t.ChampionTeamID, t.ChampionTeamName, t.ChampionTeamLogo,
		t.PrizePool, t.PrizeDescription,
		t.CreatedAt, t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *tournamentRepo) Update(ctx context.Context, t *model.Tournament) error {
	var dailyStartTime interface{}
	if t.DailyStartTime != nil {
		dailyStartTime = *t.DailyStartTime
	}
	_, err := r.db.Exec(ctx,
		`UPDATE tournaments SET event_id = $2, name = $3, format = $4, stage = $5, best_of = $6, max_teams = $7,
		        status = $8, registration_start = $9, registration_end = $10, start_date = $11, end_date = $12, rules = $13,
		        kill_point_value = $14, wwcd_bonus = $15, qualification_threshold = $16, max_lobby_teams = $17,
		        school_level = $18, daily_start_time = $19::TIME,
		        default_num_maps = $20, default_map_names = $21, tiebreaker_order = $22,
		        champion_team_id = $23, champion_team_name = $24, champion_team_logo = $25,
		        prize_pool = $26, prize_description = $27,
		        updated_at = $28
		 WHERE id = $1`,
		t.ID, t.EventID, t.Name, t.Format, t.Stage, t.BestOf, t.MaxTeams,
		t.Status, t.RegistrationStart, t.RegistrationEnd, t.StartDate, t.EndDate, t.Rules,
		t.KillPointValue, t.WWCDBonus, t.QualificationThreshold, t.MaxLobbyTeams,
		t.SchoolLevel, dailyStartTime,
		t.DefaultNumMaps, t.DefaultMapNames, t.TiebreakerOrder,
		t.ChampionTeamID, t.ChampionTeamName, t.ChampionTeamLogo,
		t.PrizePool, t.PrizeDescription,
		t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *tournamentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tournaments WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *tournamentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE tournaments SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("UpdateStatus: %w", err)
	}
	return nil
}

func (r *tournamentRepo) List(ctx context.Context, filter model.TournamentFilter) ([]*model.Tournament, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.EventID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("event_id = $%d", argIdx))
		args = append(args, *filter.EventID)
	}
	// Non-nil (even empty) means "restrict": admin with no events sees nothing.
	if filter.EventIDs != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("event_id = ANY($%d)", argIdx))
		args = append(args, filter.EventIDs)
	}
	if filter.GameID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("game_id = $%d", argIdx))
		args = append(args, *filter.GameID)
	}
	if filter.Status != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *filter.Status)
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit
	argIdx++
	limitArg := argIdx
	args = append(args, filter.Limit)
	argIdx++
	offsetArg := argIdx
	args = append(args, offset)

	query := fmt.Sprintf(
		`SELECT id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'), game_id, name, format, stage, best_of, max_teams, status,
		        registration_start, registration_end, start_date, end_date, rules,
		        COALESCE(kill_point_value, 1.0), COALESCE(wwcd_bonus, 0),
		        qualification_threshold, max_lobby_teams, school_level,
		        TO_CHAR(daily_start_time, 'HH24:MI'),
		        COALESCE(default_num_maps, 1), COALESCE(default_map_names, '{}'),
		        COALESCE(tiebreaker_order, '{wwcd,placement_points,kills,best_placement}'),
		        champion_team_id, champion_team_name, champion_team_logo,
		        prize_pool, prize_description,
		        created_at, updated_at,
		        COUNT(*) OVER() AS total_count
		 FROM tournaments%s
		 ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, limitArg, offsetArg,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var tournaments []*model.Tournament
	var total int
	for rows.Next() {
		t := &model.Tournament{}
		if err := rows.Scan(&t.ID, &t.EventID, &t.GameID, &t.Name, &t.Format, &t.Stage, &t.BestOf, &t.MaxTeams, &t.Status,
			&t.RegistrationStart, &t.RegistrationEnd, &t.StartDate, &t.EndDate, &t.Rules,
			&t.KillPointValue, &t.WWCDBonus,
			&t.QualificationThreshold, &t.MaxLobbyTeams, &t.SchoolLevel,
			&t.DailyStartTime,
			&t.DefaultNumMaps, &t.DefaultMapNames,
			&t.TiebreakerOrder,
			&t.ChampionTeamID, &t.ChampionTeamName, &t.ChampionTeamLogo,
			&t.PrizePool, &t.PrizeDescription,
			&t.CreatedAt, &t.UpdatedAt, &total); err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		tournaments = append(tournaments, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return tournaments, total, nil
}

func (r *tournamentRepo) CountActive(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM tournaments WHERE status NOT IN ('completed', 'cancelled')`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountActive: %w", err)
	}
	return count, nil
}

func (r *tournamentRepo) CountTeams(ctx context.Context, tournamentID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM tournament_teams WHERE tournament_id = $1`, tournamentID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountTeams: %w", err)
	}
	return count, nil
}

func (r *tournamentRepo) CountTeamsBatch(ctx context.Context, tournamentIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	if len(tournamentIDs) == 0 {
		return map[uuid.UUID]int{}, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT tournament_id, COUNT(*) FROM tournament_teams WHERE tournament_id = ANY($1) GROUP BY tournament_id`, tournamentIDs)
	if err != nil {
		return nil, fmt.Errorf("CountTeamsBatch: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]int, len(tournamentIDs))
	for rows.Next() {
		var tournamentID uuid.UUID
		var count int
		if err := rows.Scan(&tournamentID, &count); err != nil {
			return nil, fmt.Errorf("CountTeamsBatch scan: %w", err)
		}
		result[tournamentID] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("CountTeamsBatch rows: %w", err)
	}
	return result, nil
}

func (r *tournamentRepo) ListDueForTransition(ctx context.Context, now time.Time) ([]*model.Tournament, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'), game_id, name, format, stage, best_of, max_teams, status,
		        registration_start, registration_end, start_date, end_date, rules,
		        COALESCE(kill_point_value, 1.0), COALESCE(wwcd_bonus, 0),
		        qualification_threshold, max_lobby_teams, school_level,
		        TO_CHAR(daily_start_time, 'HH24:MI'),
		        COALESCE(default_num_maps, 1), COALESCE(default_map_names, '{}'),
		        COALESCE(tiebreaker_order, '{wwcd,placement_points,kills,best_placement}'),
		        champion_team_id, champion_team_name, champion_team_logo,
		        prize_pool, prize_description,
		        created_at, updated_at
		 FROM tournaments
		 WHERE (status = 'registration' AND registration_end IS NOT NULL AND registration_end <= $1)
		    OR (status = 'ongoing'      AND end_date          IS NOT NULL AND end_date          <= $1)`,
		now)
	if err != nil {
		return nil, fmt.Errorf("ListDueForTransition: %w", err)
	}
	defer rows.Close()

	var tournaments []*model.Tournament
	for rows.Next() {
		t := &model.Tournament{}
		if err := rows.Scan(
			&t.ID, &t.EventID, &t.GameID, &t.Name, &t.Format, &t.Stage, &t.BestOf, &t.MaxTeams, &t.Status,
			&t.RegistrationStart, &t.RegistrationEnd, &t.StartDate, &t.EndDate, &t.Rules,
			&t.KillPointValue, &t.WWCDBonus,
			&t.QualificationThreshold, &t.MaxLobbyTeams, &t.SchoolLevel,
			&t.DailyStartTime,
			&t.DefaultNumMaps, &t.DefaultMapNames,
			&t.TiebreakerOrder,
			&t.ChampionTeamID, &t.ChampionTeamName, &t.ChampionTeamLogo,
			&t.PrizePool, &t.PrizeDescription,
			&t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("ListDueForTransition scan: %w", err)
		}
		tournaments = append(tournaments, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListDueForTransition rows: %w", err)
	}
	return tournaments, nil
}

// --- TournamentTeamRepository ---

type tournamentTeamRepo struct {
	db *pgxpool.Pool
}

func NewTournamentTeamRepo(db *pgxpool.Pool) model.TournamentTeamRepository {
	return &tournamentTeamRepo{db: db}
}

func (r *tournamentTeamRepo) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.TournamentTeam, error) {
	tt := &model.TournamentTeam{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, team_id, group_name, seed, status
		 FROM tournament_teams WHERE tournament_id = $1 AND team_id = $2`, tournamentID, teamID).
		Scan(&tt.ID, &tt.TournamentID, &tt.TeamID, &tt.GroupName, &tt.Seed, &tt.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByTournamentAndTeam: %w", err)
	}
	return tt, nil
}

func (r *tournamentTeamRepo) Create(ctx context.Context, tt *model.TournamentTeam) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO tournament_teams (id, tournament_id, team_id, group_name, seed, status)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		tt.ID, tt.TournamentID, tt.TeamID, tt.GroupName, tt.Seed, tt.Status)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *tournamentTeamRepo) UpdateSeed(ctx context.Context, tournamentID, teamID uuid.UUID, seed *int) error {
	_, err := r.db.Exec(ctx,
		`UPDATE tournament_teams SET seed = $3 WHERE tournament_id = $1 AND team_id = $2`,
		tournamentID, teamID, seed)
	if err != nil {
		return fmt.Errorf("UpdateSeed: %w", err)
	}
	return nil
}

func (r *tournamentTeamRepo) Delete(ctx context.Context, tournamentID, teamID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM tournament_teams WHERE tournament_id = $1 AND team_id = $2`, tournamentID, teamID)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *tournamentTeamRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentTeam, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, group_name, seed, status
		 FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed ASC NULLS LAST LIMIT 500`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var teams []*model.TournamentTeam
	for rows.Next() {
		tt := &model.TournamentTeam{}
		if err := rows.Scan(&tt.ID, &tt.TournamentID, &tt.TeamID, &tt.GroupName, &tt.Seed, &tt.Status); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		teams = append(teams, tt)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return teams, nil
}

func (r *tournamentTeamRepo) ListApprovedTeams(ctx context.Context, tournamentID uuid.UUID) ([]*model.Team, error) {
	rows, err := r.db.Query(ctx,
		`SELECT t.id, t.name, t.school_id, t.game_id, t.captain_user_id, t.logo_url, t.status, t.seed, t.created_at, t.updated_at
		 FROM teams t
		 JOIN tournament_teams tt ON tt.team_id = t.id
		 WHERE tt.tournament_id = $1 AND tt.status = 'approved'
		 ORDER BY tt.seed ASC NULLS LAST`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListApprovedTeams: %w", err)
	}
	defer rows.Close()

	var teams []*model.Team
	for rows.Next() {
		t := &model.Team{}
		if err := rows.Scan(&t.ID, &t.Name, &t.SchoolID, &t.GameID, &t.CaptainUserID, &t.LogoURL, &t.Status, &t.Seed, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("ListApprovedTeams scan: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListApprovedTeams rows: %w", err)
	}

	return teams, nil
}
