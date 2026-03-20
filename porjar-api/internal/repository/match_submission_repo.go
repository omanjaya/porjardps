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
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ──────────────────────────────────────────────
// MatchSubmissionRepo
// ──────────────────────────────────────────────

type matchSubmissionRepo struct {
	db *pgxpool.Pool
}

func NewMatchSubmissionRepo(db *pgxpool.Pool) model.MatchSubmissionRepository {
	return &matchSubmissionRepo{db: db}
}

const matchSubmissionCols = `id, bracket_match_id, br_lobby_id, submitted_by, team_id,
	claimed_winner_id, claimed_score_a, claimed_score_b,
	claimed_placement, claimed_kills,
	screenshot_urls, status, verified_by, verified_at,
	rejection_reason, admin_notes, created_at, updated_at`

func scanMatchSubmission(row pgx.Row) (*model.MatchSubmission, error) {
	s := &model.MatchSubmission{}
	err := row.Scan(
		&s.ID, &s.BracketMatchID, &s.BRLobbyID, &s.SubmittedBy, &s.TeamID,
		&s.ClaimedWinnerID, &s.ClaimedScoreA, &s.ClaimedScoreB,
		&s.ClaimedPlacement, &s.ClaimedKills,
		&s.ScreenshotURLs, &s.Status, &s.VerifiedBy, &s.VerifiedAt,
		&s.RejectionReason, &s.AdminNotes, &s.CreatedAt, &s.UpdatedAt,
	)
	return s, err
}

func scanMatchSubmissions(rows pgx.Rows) ([]*model.MatchSubmission, error) {
	var result []*model.MatchSubmission
	for rows.Next() {
		s := &model.MatchSubmission{}
		if err := rows.Scan(
			&s.ID, &s.BracketMatchID, &s.BRLobbyID, &s.SubmittedBy, &s.TeamID,
			&s.ClaimedWinnerID, &s.ClaimedScoreA, &s.ClaimedScoreB,
			&s.ClaimedPlacement, &s.ClaimedKills,
			&s.ScreenshotURLs, &s.Status, &s.VerifiedBy, &s.VerifiedAt,
			&s.RejectionReason, &s.AdminNotes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func (r *matchSubmissionRepo) Create(ctx context.Context, s *model.MatchSubmission) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.Status == "" {
		s.Status = "pending"
	}
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()

	var insertedID uuid.UUID
	err := r.db.QueryRow(ctx,
		`INSERT INTO match_submissions
			(id, bracket_match_id, br_lobby_id, submitted_by, team_id,
			 claimed_winner_id, claimed_score_a, claimed_score_b,
			 claimed_placement, claimed_kills,
			 screenshot_urls, status, verified_by, verified_at,
			 rejection_reason, admin_notes, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		 ON CONFLICT DO NOTHING
		 RETURNING id`,
		s.ID, s.BracketMatchID, s.BRLobbyID, s.SubmittedBy, s.TeamID,
		s.ClaimedWinnerID, s.ClaimedScoreA, s.ClaimedScoreB,
		s.ClaimedPlacement, s.ClaimedKills,
		s.ScreenshotURLs, s.Status, s.VerifiedBy, s.VerifiedAt,
		s.RejectionReason, s.AdminNotes, s.CreatedAt, s.UpdatedAt,
	).Scan(&insertedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// ON CONFLICT DO NOTHING: a pending submission for this team/match already exists
			return apperror.Conflict("DUPLICATE_SUBMISSION", "Submission pending untuk tim ini sudah ada")
		}
		return fmt.Errorf("Create match submission: %w", err)
	}
	s.ID = insertedID
	return nil
}

func (r *matchSubmissionRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.MatchSubmission, error) {
	row := r.db.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE id = $1`, matchSubmissionCols), id)
	s, err := scanMatchSubmission(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return s, nil
}

func (r *matchSubmissionRepo) FindByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.MatchSubmission, error) {
	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE bracket_match_id = $1 ORDER BY created_at DESC`, matchSubmissionCols),
		bracketMatchID)
	if err != nil {
		return nil, fmt.Errorf("FindByMatch: %w", err)
	}
	defer rows.Close()
	return scanMatchSubmissions(rows)
}

func (r *matchSubmissionRepo) FindByBracketMatchIDs(ctx context.Context, matchIDs []uuid.UUID) (map[uuid.UUID][]*model.MatchSubmission, error) {
	if len(matchIDs) == 0 {
		return map[uuid.UUID][]*model.MatchSubmission{}, nil
	}
	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE bracket_match_id = ANY($1) ORDER BY created_at DESC`, matchSubmissionCols),
		matchIDs)
	if err != nil {
		return nil, fmt.Errorf("FindByBracketMatchIDs: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]*model.MatchSubmission)
	for rows.Next() {
		s := &model.MatchSubmission{}
		if err := rows.Scan(
			&s.ID, &s.BracketMatchID, &s.BRLobbyID, &s.SubmittedBy, &s.TeamID,
			&s.ClaimedWinnerID, &s.ClaimedScoreA, &s.ClaimedScoreB,
			&s.ClaimedPlacement, &s.ClaimedKills,
			&s.ScreenshotURLs, &s.Status, &s.VerifiedBy, &s.VerifiedAt,
			&s.RejectionReason, &s.AdminNotes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("FindByBracketMatchIDs scan: %w", err)
		}
		if s.BracketMatchID != nil {
			key := *s.BracketMatchID
			result[key] = append(result[key], s)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByBracketMatchIDs rows: %w", err)
	}
	return result, nil
}

func (r *matchSubmissionRepo) FindByLobby(ctx context.Context, brLobbyID uuid.UUID) ([]*model.MatchSubmission, error) {
	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE br_lobby_id = $1 ORDER BY created_at DESC`, matchSubmissionCols),
		brLobbyID)
	if err != nil {
		return nil, fmt.Errorf("FindByLobby: %w", err)
	}
	defer rows.Close()
	return scanMatchSubmissions(rows)
}

func (r *matchSubmissionRepo) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.MatchSubmission, error) {
	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE team_id = $1 ORDER BY created_at DESC`, matchSubmissionCols),
		teamID)
	if err != nil {
		return nil, fmt.Errorf("FindByTeam: %w", err)
	}
	defer rows.Close()
	return scanMatchSubmissions(rows)
}

func (r *matchSubmissionRepo) FindPending(ctx context.Context, page, limit int) ([]*model.MatchSubmission, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM match_submissions WHERE status = 'pending'`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("FindPending count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1 OFFSET $2`, matchSubmissionCols),
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("FindPending: %w", err)
	}
	defer rows.Close()
	subs, err := scanMatchSubmissions(rows)
	if err != nil {
		return nil, 0, err
	}
	return subs, total, nil
}

func (r *matchSubmissionRepo) FindPendingByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.MatchSubmission, error) {
	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM match_submissions WHERE bracket_match_id = $1 AND status = 'pending' ORDER BY created_at ASC`, matchSubmissionCols),
		bracketMatchID)
	if err != nil {
		return nil, fmt.Errorf("FindPendingByMatch: %w", err)
	}
	defer rows.Close()
	return scanMatchSubmissions(rows)
}

func (r *matchSubmissionRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, verifiedBy *uuid.UUID, rejectionReason *string, adminNotes *string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx,
		`UPDATE match_submissions
		 SET status = $2, verified_by = $3, verified_at = $4,
		     rejection_reason = $5, admin_notes = $6, updated_at = $7
		 WHERE id = $1`,
		id, status, verifiedBy, &now, rejectionReason, adminNotes, now)
	if err != nil {
		return fmt.Errorf("UpdateStatus: %w", err)
	}
	return nil
}

func (r *matchSubmissionRepo) List(ctx context.Context, filter model.MatchSubmissionFilter) ([]*model.MatchSubmission, int, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit

	var conditions []string
	var args []interface{}
	argIdx := 1

	if filter.BracketMatchID != nil {
		conditions = append(conditions, fmt.Sprintf("bracket_match_id = $%d", argIdx))
		args = append(args, *filter.BracketMatchID)
		argIdx++
	}
	if filter.BRLobbyID != nil {
		conditions = append(conditions, fmt.Sprintf("br_lobby_id = $%d", argIdx))
		args = append(args, *filter.BRLobbyID)
		argIdx++
	}
	if filter.TeamID != nil {
		conditions = append(conditions, fmt.Sprintf("team_id = $%d", argIdx))
		args = append(args, *filter.TeamID)
		argIdx++
	}
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *filter.Status)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM match_submissions %s", where)
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("List count: %w", err)
	}

	query := fmt.Sprintf(`SELECT %s FROM match_submissions %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		matchSubmissionCols, where, argIdx, argIdx+1)
	args = append(args, filter.Limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List: %w", err)
	}
	defer rows.Close()
	subs, err := scanMatchSubmissions(rows)
	if err != nil {
		return nil, 0, err
	}
	return subs, total, nil
}

// ──────────────────────────────────────────────
// CoachSchoolRepo
// ──────────────────────────────────────────────

type coachSchoolRepo struct {
	db *pgxpool.Pool
}

func NewCoachSchoolRepo(db *pgxpool.Pool) model.CoachSchoolRepository {
	return &coachSchoolRepo{db: db}
}

func (r *coachSchoolRepo) Create(ctx context.Context, cs *model.CoachSchool) error {
	if cs.ID == uuid.Nil {
		cs.ID = uuid.New()
	}
	cs.CreatedAt = time.Now()

	_, err := r.db.Exec(ctx,
		`INSERT INTO coach_schools (id, user_id, school_id, created_at)
		 VALUES ($1, $2, $3, $4)`,
		cs.ID, cs.UserID, cs.SchoolID, cs.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create coach_school: %w", err)
	}
	return nil
}

func (r *coachSchoolRepo) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.CoachSchool, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, school_id, created_at FROM coach_schools WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("FindByUser: %w", err)
	}
	defer rows.Close()

	var result []*model.CoachSchool
	for rows.Next() {
		cs := &model.CoachSchool{}
		if err := rows.Scan(&cs.ID, &cs.UserID, &cs.SchoolID, &cs.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByUser scan: %w", err)
		}
		result = append(result, cs)
	}
	return result, rows.Err()
}

func (r *coachSchoolRepo) FindBySchool(ctx context.Context, schoolID uuid.UUID) ([]*model.CoachSchool, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, school_id, created_at FROM coach_schools WHERE school_id = $1 ORDER BY created_at DESC`, schoolID)
	if err != nil {
		return nil, fmt.Errorf("FindBySchool: %w", err)
	}
	defer rows.Close()

	var result []*model.CoachSchool
	for rows.Next() {
		cs := &model.CoachSchool{}
		if err := rows.Scan(&cs.ID, &cs.UserID, &cs.SchoolID, &cs.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindBySchool scan: %w", err)
		}
		result = append(result, cs)
	}
	return result, rows.Err()
}

func (r *coachSchoolRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM coach_schools WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete coach_school: %w", err)
	}
	return nil
}
