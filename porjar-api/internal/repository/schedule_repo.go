package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type scheduleRepo struct {
	db *pgxpool.Pool
}

func NewScheduleRepo(db *pgxpool.Pool) model.ScheduleRepository {
	return &scheduleRepo{db: db}
}

const scheduleSelectCols = `
	s.id, s.tournament_id, s.bracket_match_id, s.br_lobby_id,
	s.title, s.description, s.venue,
	s.scheduled_at, s.end_at, s.status,
	t.id, t.name,
	g.id, g.name, g.slug, g.game_type,
	ta.id, ta.name, sa.name,
	tb.id, tb.name, sb.name`

const scheduleFromJoin = `
	FROM schedules s
	LEFT JOIN tournaments t ON t.id = s.tournament_id
	LEFT JOIN games g ON g.id = t.game_id
	LEFT JOIN bracket_matches bm ON bm.id = s.bracket_match_id
	LEFT JOIN teams ta ON ta.id = bm.team_a_id
	LEFT JOIN schools sa ON sa.id = ta.school_id
	LEFT JOIN teams tb ON tb.id = bm.team_b_id
	LEFT JOIN schools sb ON sb.id = tb.school_id`

func populateSchedule(s *model.Schedule,
	tID pgtype.UUID, tName pgtype.Text,
	gID pgtype.UUID, gName, gSlug, gType pgtype.Text,
	taID pgtype.UUID, taName, saName pgtype.Text,
	tbID pgtype.UUID, tbName, sbName pgtype.Text,
) {
	if tID.Valid {
		tid, _ := uuid.FromBytes(tID.Bytes[:])
		s.Tournament = &model.TournamentSummary{ID: tid, Name: tName.String}
	}
	if gID.Valid {
		gid, _ := uuid.FromBytes(gID.Bytes[:])
		s.Game = &model.GameSummary{ID: gid, Name: gName.String, Slug: gSlug.String, GameType: gType.String}
	}
	if taID.Valid {
		aid, _ := uuid.FromBytes(taID.Bytes[:])
		team := &model.ScheduleTeam{ID: aid, Name: taName.String}
		if saName.Valid {
			team.SchoolName = &saName.String
		}
		s.TeamA = team
	}
	if tbID.Valid {
		bid, _ := uuid.FromBytes(tbID.Bytes[:])
		team := &model.ScheduleTeam{ID: bid, Name: tbName.String}
		if sbName.Valid {
			team.SchoolName = &sbName.String
		}
		s.TeamB = team
	}
}

func scanSchedule(row pgx.Row) (*model.Schedule, error) {
	s := &model.Schedule{}
	var (
		tID, gID, taID, tbID   pgtype.UUID
		tName, gName, gSlug, gType pgtype.Text
		taName, saName, tbName, sbName pgtype.Text
	)
	err := row.Scan(
		&s.ID, &s.TournamentID, &s.BracketMatchID, &s.BRLobbyID,
		&s.Title, &s.Description, &s.Venue,
		&s.ScheduledAt, &s.EndAt, &s.Status,
		&tID, &tName,
		&gID, &gName, &gSlug, &gType,
		&taID, &taName, &saName,
		&tbID, &tbName, &sbName,
	)
	if err != nil {
		return nil, err
	}
	populateSchedule(s, tID, tName, gID, gName, gSlug, gType, taID, taName, saName, tbID, tbName, sbName)
	return s, nil
}

func scanScheduleRow(rows pgx.Rows) (*model.Schedule, error) {
	s := &model.Schedule{}
	var (
		tID, gID, taID, tbID       pgtype.UUID
		tName, gName, gSlug, gType pgtype.Text
		taName, saName, tbName, sbName pgtype.Text
	)
	if err := rows.Scan(
		&s.ID, &s.TournamentID, &s.BracketMatchID, &s.BRLobbyID,
		&s.Title, &s.Description, &s.Venue,
		&s.ScheduledAt, &s.EndAt, &s.Status,
		&tID, &tName,
		&gID, &gName, &gSlug, &gType,
		&taID, &taName, &saName,
		&tbID, &tbName, &sbName,
	); err != nil {
		return nil, err
	}
	populateSchedule(s, tID, tName, gID, gName, gSlug, gType, taID, taName, saName, tbID, tbName, sbName)
	return s, nil
}

func (r *scheduleRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Schedule, error) {
	row := r.db.QueryRow(ctx,
		`SELECT`+scheduleSelectCols+scheduleFromJoin+` WHERE s.id = $1`, id)
	s, err := scanSchedule(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return s, nil
}

func (r *scheduleRepo) Create(ctx context.Context, s *model.Schedule) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO schedules (id, tournament_id, bracket_match_id, br_lobby_id, title, description, venue,
		        scheduled_at, end_at, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		s.ID, s.TournamentID, s.BracketMatchID, s.BRLobbyID, s.Title, s.Description, s.Venue,
		s.ScheduledAt, s.EndAt, s.Status)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *scheduleRepo) Update(ctx context.Context, s *model.Schedule) error {
	_, err := r.db.Exec(ctx,
		`UPDATE schedules SET tournament_id = $2, bracket_match_id = $3, br_lobby_id = $4,
		        title = $5, description = $6, venue = $7, scheduled_at = $8, end_at = $9, status = $10
		 WHERE id = $1`,
		s.ID, s.TournamentID, s.BracketMatchID, s.BRLobbyID, s.Title, s.Description, s.Venue,
		s.ScheduledAt, s.EndAt, s.Status)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *scheduleRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM schedules WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *scheduleRepo) List(ctx context.Context, filter model.ScheduleFilter) ([]*model.Schedule, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.TournamentID != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("s.tournament_id = $%d", argIdx))
		args = append(args, *filter.TournamentID)
	}
	if filter.Status != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("s.status = $%d", argIdx))
		args = append(args, *filter.Status)
	}
	if filter.From != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("s.scheduled_at >= $%d", argIdx))
		args = append(args, *filter.From)
	}
	if filter.To != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("s.scheduled_at <= $%d", argIdx))
		args = append(args, *filter.To)
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := "SELECT COUNT(*) FROM schedules s" + where
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("List count: %w", err)
	}

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit
	argIdx++
	limitClause := fmt.Sprintf(" ORDER BY s.scheduled_at ASC LIMIT $%d", argIdx)
	args = append(args, filter.Limit)
	argIdx++
	limitClause += fmt.Sprintf(" OFFSET $%d", argIdx)
	args = append(args, offset)

	query := `SELECT` + scheduleSelectCols + scheduleFromJoin + where + limitClause

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var schedules []*model.Schedule
	for rows.Next() {
		s, err := scanScheduleRow(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		schedules = append(schedules, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return schedules, total, nil
}

func (r *scheduleRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.Schedule, error) {
	rows, err := r.db.Query(ctx,
		`SELECT`+scheduleSelectCols+scheduleFromJoin+` WHERE s.tournament_id = $1 ORDER BY s.scheduled_at ASC`,
		tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var schedules []*model.Schedule
	for rows.Next() {
		s, err := scanScheduleRow(rows)
		if err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		schedules = append(schedules, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return schedules, nil
}

func (r *scheduleRepo) FindToday(ctx context.Context) ([]*model.Schedule, error) {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	rows, err := r.db.Query(ctx,
		`SELECT`+scheduleSelectCols+scheduleFromJoin+
			` WHERE s.scheduled_at >= $1 AND s.scheduled_at < $2 ORDER BY s.scheduled_at ASC`,
		startOfDay, endOfDay)
	if err != nil {
		return nil, fmt.Errorf("FindToday: %w", err)
	}
	defer rows.Close()

	var schedules []*model.Schedule
	for rows.Next() {
		s, err := scanScheduleRow(rows)
		if err != nil {
			return nil, fmt.Errorf("FindToday scan: %w", err)
		}
		schedules = append(schedules, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindToday rows: %w", err)
	}

	return schedules, nil
}

func (r *scheduleRepo) FindUpcoming(ctx context.Context, limit int) ([]*model.Schedule, error) {
	rows, err := r.db.Query(ctx,
		`SELECT`+scheduleSelectCols+scheduleFromJoin+
			` WHERE s.scheduled_at > NOW() AND s.status != 'completed' AND s.status != 'cancelled'`+
			` ORDER BY s.scheduled_at ASC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("FindUpcoming: %w", err)
	}
	defer rows.Close()

	var schedules []*model.Schedule
	for rows.Next() {
		s, err := scanScheduleRow(rows)
		if err != nil {
			return nil, fmt.Errorf("FindUpcoming scan: %w", err)
		}
		schedules = append(schedules, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindUpcoming rows: %w", err)
	}

	return schedules, nil
}
