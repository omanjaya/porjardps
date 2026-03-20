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

type teamMemberRepo struct {
	db *pgxpool.Pool
}

func NewTeamMemberRepo(db *pgxpool.Pool) model.TeamMemberRepository {
	return &teamMemberRepo{db: db}
}

func (r *teamMemberRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.TeamMember, error) {
	m := &model.TeamMember{}
	err := r.db.QueryRow(ctx,
		`SELECT id, team_id, user_id, in_game_name, in_game_id, role, jersey_number, joined_at
		 FROM team_members WHERE id = $1`, id).
		Scan(&m.ID, &m.TeamID, &m.UserID, &m.InGameName, &m.InGameID, &m.Role, &m.JerseyNumber, &m.JoinedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return m, nil
}

func (r *teamMemberRepo) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.TeamMember, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, team_id, user_id, in_game_name, in_game_id, role, jersey_number, joined_at
		 FROM team_members WHERE team_id = $1 ORDER BY joined_at ASC`, teamID)
	if err != nil {
		return nil, fmt.Errorf("FindByTeam: %w", err)
	}
	defer rows.Close()

	var members []*model.TeamMember
	for rows.Next() {
		m := &model.TeamMember{}
		if err := rows.Scan(&m.ID, &m.TeamID, &m.UserID, &m.InGameName, &m.InGameID, &m.Role, &m.JerseyNumber, &m.JoinedAt); err != nil {
			return nil, fmt.Errorf("FindByTeam scan: %w", err)
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTeam rows: %w", err)
	}

	return members, nil
}

func (r *teamMemberRepo) FindByTeamAndUser(ctx context.Context, teamID, userID uuid.UUID) (*model.TeamMember, error) {
	m := &model.TeamMember{}
	err := r.db.QueryRow(ctx,
		`SELECT id, team_id, user_id, in_game_name, in_game_id, role, jersey_number, joined_at
		 FROM team_members WHERE team_id = $1 AND user_id = $2`, teamID, userID).
		Scan(&m.ID, &m.TeamID, &m.UserID, &m.InGameName, &m.InGameID, &m.Role, &m.JerseyNumber, &m.JoinedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByTeamAndUser: %w", err)
	}
	return m, nil
}

func (r *teamMemberRepo) FindUserTeamsForGame(ctx context.Context, userID, gameID uuid.UUID) ([]*model.TeamMember, error) {
	rows, err := r.db.Query(ctx,
		`SELECT tm.id, tm.team_id, tm.user_id, tm.in_game_name, tm.in_game_id, tm.role, tm.jersey_number, tm.joined_at
		 FROM team_members tm
		 JOIN teams t ON t.id = tm.team_id
		 WHERE tm.user_id = $1 AND t.game_id = $2`, userID, gameID)
	if err != nil {
		return nil, fmt.Errorf("FindUserTeamsForGame: %w", err)
	}
	defer rows.Close()

	var members []*model.TeamMember
	for rows.Next() {
		m := &model.TeamMember{}
		if err := rows.Scan(&m.ID, &m.TeamID, &m.UserID, &m.InGameName, &m.InGameID, &m.Role, &m.JerseyNumber, &m.JoinedAt); err != nil {
			return nil, fmt.Errorf("FindUserTeamsForGame scan: %w", err)
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindUserTeamsForGame rows: %w", err)
	}

	return members, nil
}

func (r *teamMemberRepo) Create(ctx context.Context, m *model.TeamMember) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO team_members (id, team_id, user_id, in_game_name, in_game_id, role, jersey_number, joined_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		m.ID, m.TeamID, m.UserID, m.InGameName, m.InGameID, m.Role, m.JerseyNumber, m.JoinedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *teamMemberRepo) CreateTx(ctx context.Context, tx pgx.Tx, m *model.TeamMember) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO team_members (id, team_id, user_id, in_game_name, in_game_id, role, jersey_number, joined_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		m.ID, m.TeamID, m.UserID, m.InGameName, m.InGameID, m.Role, m.JerseyNumber, m.JoinedAt)
	if err != nil {
		return fmt.Errorf("CreateTx: %w", err)
	}
	return nil
}

func (r *teamMemberRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM team_members WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *teamMemberRepo) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.TeamMember, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, team_id, user_id, in_game_name, in_game_id, role, jersey_number, joined_at
		 FROM team_members WHERE user_id = $1 ORDER BY joined_at ASC`, userID)
	if err != nil {
		return nil, fmt.Errorf("FindByUser: %w", err)
	}
	defer rows.Close()

	var members []*model.TeamMember
	for rows.Next() {
		m := &model.TeamMember{}
		if err := rows.Scan(&m.ID, &m.TeamID, &m.UserID, &m.InGameName, &m.InGameID, &m.Role, &m.JerseyNumber, &m.JoinedAt); err != nil {
			return nil, fmt.Errorf("FindByUser scan: %w", err)
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByUser rows: %w", err)
	}
	return members, nil
}

func (r *teamMemberRepo) CountByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM team_members WHERE team_id = $1`, teamID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountByTeam: %w", err)
	}
	return count, nil
}

func (r *teamMemberRepo) CountByTeams(ctx context.Context, teamIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	if len(teamIDs) == 0 {
		return map[uuid.UUID]int{}, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT team_id, COUNT(*) FROM team_members WHERE team_id = ANY($1) GROUP BY team_id`, teamIDs)
	if err != nil {
		return nil, fmt.Errorf("CountByTeams: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]int, len(teamIDs))
	for rows.Next() {
		var teamID uuid.UUID
		var count int
		if err := rows.Scan(&teamID, &count); err != nil {
			return nil, fmt.Errorf("CountByTeams scan: %w", err)
		}
		result[teamID] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("CountByTeams rows: %w", err)
	}
	return result, nil
}

func (r *teamMemberRepo) CountSubstitutes(ctx context.Context, teamID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND role = 'substitute'`, teamID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountSubstitutes: %w", err)
	}
	return count, nil
}
