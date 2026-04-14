package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// --- TournamentPenaltyConfigRepository ---

type tournamentPenaltyConfigRepo struct {
	db *pgxpool.Pool
}

func NewTournamentPenaltyConfigRepo(db *pgxpool.Pool) model.TournamentPenaltyConfigRepository {
	return &tournamentPenaltyConfigRepo{db: db}
}

func (r *tournamentPenaltyConfigRepo) Upsert(ctx context.Context, c *model.TournamentPenaltyConfig) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO tournament_penalty_configs (id, tournament_id, card_type, point_deduction, is_disqualification, description, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW())
		 ON CONFLICT (tournament_id, card_type) DO UPDATE SET
		   point_deduction = EXCLUDED.point_deduction,
		   is_disqualification = EXCLUDED.is_disqualification,
		   description = EXCLUDED.description,
		   updated_at = NOW()`,
		c.ID, c.TournamentID, c.CardType, c.PointDeduction, c.IsDisqualification, c.Description)
	if err != nil {
		return fmt.Errorf("Upsert: %w", err)
	}
	return nil
}

func (r *tournamentPenaltyConfigRepo) FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentPenaltyConfig, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, card_type, point_deduction, is_disqualification, description, updated_at
		 FROM tournament_penalty_configs WHERE tournament_id = $1
		 ORDER BY card_type`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("FindByTournament: %w", err)
	}
	defer rows.Close()

	var configs []*model.TournamentPenaltyConfig
	for rows.Next() {
		c := &model.TournamentPenaltyConfig{}
		if err := rows.Scan(&c.ID, &c.TournamentID, &c.CardType, &c.PointDeduction, &c.IsDisqualification, &c.Description, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("FindByTournament scan: %w", err)
		}
		configs = append(configs, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTournament rows: %w", err)
	}
	return configs, nil
}

func (r *tournamentPenaltyConfigRepo) FindByTournamentAndType(ctx context.Context, tournamentID uuid.UUID, cardType string) (*model.TournamentPenaltyConfig, error) {
	c := &model.TournamentPenaltyConfig{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, card_type, point_deduction, is_disqualification, description, updated_at
		 FROM tournament_penalty_configs WHERE tournament_id = $1 AND card_type = $2`, tournamentID, cardType).
		Scan(&c.ID, &c.TournamentID, &c.CardType, &c.PointDeduction, &c.IsDisqualification, &c.Description, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByTournamentAndType: %w", err)
	}
	return c, nil
}

// --- RefereeAssignmentRepository ---

type refereeAssignmentRepo struct {
	db *pgxpool.Pool
}

func NewRefereeAssignmentRepo(db *pgxpool.Pool) model.RefereeAssignmentRepository {
	return &refereeAssignmentRepo{db: db}
}

func (r *refereeAssignmentRepo) Create(ctx context.Context, a *model.RefereeAssignment) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO referee_assignments (id, referee_id, tournament_id, bracket_match_id, br_lobby_id, group_match_id, assigned_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		a.ID, a.RefereeID, a.TournamentID, a.BracketMatchID, a.BRLobbyID, a.GroupMatchID, a.AssignedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *refereeAssignmentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM referee_assignments WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *refereeAssignmentRepo) FindByReferee(ctx context.Context, refereeID uuid.UUID) ([]*model.RefereeAssignment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, referee_id, tournament_id, bracket_match_id, br_lobby_id, group_match_id, assigned_at
		 FROM referee_assignments WHERE referee_id = $1
		 ORDER BY assigned_at DESC`, refereeID)
	if err != nil {
		return nil, fmt.Errorf("FindByReferee: %w", err)
	}
	defer rows.Close()

	var assignments []*model.RefereeAssignment
	for rows.Next() {
		a := &model.RefereeAssignment{}
		if err := rows.Scan(&a.ID, &a.RefereeID, &a.TournamentID, &a.BracketMatchID, &a.BRLobbyID, &a.GroupMatchID, &a.AssignedAt); err != nil {
			return nil, fmt.Errorf("FindByReferee scan: %w", err)
		}
		assignments = append(assignments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByReferee rows: %w", err)
	}
	return assignments, nil
}

func (r *refereeAssignmentRepo) FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.RefereeAssignment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, referee_id, tournament_id, bracket_match_id, br_lobby_id, group_match_id, assigned_at
		 FROM referee_assignments WHERE tournament_id = $1
		 ORDER BY assigned_at DESC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("FindByTournament: %w", err)
	}
	defer rows.Close()

	var assignments []*model.RefereeAssignment
	for rows.Next() {
		a := &model.RefereeAssignment{}
		if err := rows.Scan(&a.ID, &a.RefereeID, &a.TournamentID, &a.BracketMatchID, &a.BRLobbyID, &a.GroupMatchID, &a.AssignedAt); err != nil {
			return nil, fmt.Errorf("FindByTournament scan: %w", err)
		}
		assignments = append(assignments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTournament rows: %w", err)
	}
	return assignments, nil
}

func (r *refereeAssignmentRepo) IsAssigned(ctx context.Context, refereeID uuid.UUID, bracketMatchID, brLobbyID, groupMatchID *uuid.UUID) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM referee_assignments
		 WHERE referee_id = $1
		   AND (bracket_match_id = $2 OR br_lobby_id = $3 OR group_match_id = $4)`,
		refereeID, bracketMatchID, brLobbyID, groupMatchID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("IsAssigned: %w", err)
	}
	return count > 0, nil
}

// --- MatchCardRepository ---

type matchCardRepo struct {
	db *pgxpool.Pool
}

func NewMatchCardRepo(db *pgxpool.Pool) model.MatchCardRepository {
	return &matchCardRepo{db: db}
}

func (r *matchCardRepo) Create(ctx context.Context, c *model.MatchCard) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO match_cards (id, tournament_id, team_id, issued_by, card_type, point_deduction, reason,
		  bracket_match_id, br_lobby_id, group_match_id, is_revoked, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		c.ID, c.TournamentID, c.TeamID, c.IssuedBy, c.CardType, c.PointDeduction, c.Reason,
		c.BracketMatchID, c.BRLobbyID, c.GroupMatchID, c.IsRevoked, c.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *matchCardRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.MatchCard, error) {
	c := &model.MatchCard{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, team_id, issued_by, card_type, point_deduction, reason,
		  bracket_match_id, br_lobby_id, group_match_id, is_revoked, revoked_by, revoked_at, created_at
		 FROM match_cards WHERE id = $1`, id).
		Scan(&c.ID, &c.TournamentID, &c.TeamID, &c.IssuedBy, &c.CardType, &c.PointDeduction, &c.Reason,
			&c.BracketMatchID, &c.BRLobbyID, &c.GroupMatchID, &c.IsRevoked, &c.RevokedBy, &c.RevokedAt, &c.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return c, nil
}

func (r *matchCardRepo) Revoke(ctx context.Context, id uuid.UUID, revokedBy uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE match_cards SET is_revoked = true, revoked_by = $2, revoked_at = NOW() WHERE id = $1`,
		id, revokedBy)
	if err != nil {
		return fmt.Errorf("Revoke: %w", err)
	}
	return nil
}

func (r *matchCardRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.MatchCard, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, issued_by, card_type, point_deduction, reason,
		  bracket_match_id, br_lobby_id, group_match_id, is_revoked, revoked_by, revoked_at, created_at
		 FROM match_cards WHERE tournament_id = $1
		 ORDER BY created_at DESC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()
	return r.scanCards(rows)
}

func (r *matchCardRepo) ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.MatchCard, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, issued_by, card_type, point_deduction, reason,
		  bracket_match_id, br_lobby_id, group_match_id, is_revoked, revoked_by, revoked_at, created_at
		 FROM match_cards WHERE team_id = $1
		 ORDER BY created_at DESC`, teamID)
	if err != nil {
		return nil, fmt.Errorf("ListByTeam: %w", err)
	}
	defer rows.Close()
	return r.scanCards(rows)
}

func (r *matchCardRepo) ListByMatch(ctx context.Context, bracketMatchID, brLobbyID, groupMatchID *uuid.UUID) ([]*model.MatchCard, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, issued_by, card_type, point_deduction, reason,
		  bracket_match_id, br_lobby_id, group_match_id, is_revoked, revoked_by, revoked_at, created_at
		 FROM match_cards
		 WHERE (bracket_match_id = $1 OR br_lobby_id = $2 OR group_match_id = $3)
		 ORDER BY created_at DESC`, bracketMatchID, brLobbyID, groupMatchID)
	if err != nil {
		return nil, fmt.Errorf("ListByMatch: %w", err)
	}
	defer rows.Close()
	return r.scanCards(rows)
}

func (r *matchCardRepo) ListByIssuedBy(ctx context.Context, issuedBy uuid.UUID) ([]*model.MatchCard, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, issued_by, card_type, point_deduction, reason,
		  bracket_match_id, br_lobby_id, group_match_id, is_revoked, revoked_by, revoked_at, created_at
		 FROM match_cards WHERE issued_by = $1
		 ORDER BY created_at DESC`, issuedBy)
	if err != nil {
		return nil, fmt.Errorf("ListByIssuedBy: %w", err)
	}
	defer rows.Close()
	return r.scanCards(rows)
}

func (r *matchCardRepo) SumByTeamAndTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	var sum int
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(point_deduction), 0) FROM match_cards
		 WHERE team_id = $1 AND tournament_id = $2 AND is_revoked = false`,
		teamID, tournamentID).Scan(&sum)
	if err != nil {
		return 0, fmt.Errorf("SumByTeamAndTournament: %w", err)
	}
	return sum, nil
}

func (r *matchCardRepo) scanCards(rows pgx.Rows) ([]*model.MatchCard, error) {
	var cards []*model.MatchCard
	for rows.Next() {
		c := &model.MatchCard{}
		if err := rows.Scan(&c.ID, &c.TournamentID, &c.TeamID, &c.IssuedBy, &c.CardType, &c.PointDeduction, &c.Reason,
			&c.BracketMatchID, &c.BRLobbyID, &c.GroupMatchID, &c.IsRevoked, &c.RevokedBy, &c.RevokedAt, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanCards: %w", err)
		}
		cards = append(cards, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("scanCards rows: %w", err)
	}
	return cards, nil
}
