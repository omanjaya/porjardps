package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// --- BRLobbyRepository ---

type brLobbyRepo struct {
	db *pgxpool.Pool
}

func NewBRLobbyRepo(db *pgxpool.Pool) model.BRLobbyRepository {
	return &brLobbyRepo{db: db}
}

func (r *brLobbyRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.BRLobby, error) {
	l := &model.BRLobby{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, lobby_name, lobby_number, day_number, room_id, room_password,
		        status, scheduled_at, started_at, completed_at
		 FROM br_lobbies WHERE id = $1`, id).
		Scan(&l.ID, &l.TournamentID, &l.LobbyName, &l.LobbyNumber, &l.DayNumber,
			&l.RoomID, &l.RoomPassword, &l.Status, &l.ScheduledAt, &l.StartedAt, &l.CompletedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return l, nil
}

func (r *brLobbyRepo) Create(ctx context.Context, l *model.BRLobby) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_lobbies (id, tournament_id, lobby_name, lobby_number, day_number,
		        room_id, room_password, status, scheduled_at, started_at, completed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		l.ID, l.TournamentID, l.LobbyName, l.LobbyNumber, l.DayNumber,
		l.RoomID, l.RoomPassword, l.Status, l.ScheduledAt, l.StartedAt, l.CompletedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *brLobbyRepo) Update(ctx context.Context, l *model.BRLobby) error {
	_, err := r.db.Exec(ctx,
		`UPDATE br_lobbies SET lobby_name = $2, lobby_number = $3, day_number = $4,
		        room_id = $5, room_password = $6, status = $7, scheduled_at = $8,
		        started_at = $9, completed_at = $10
		 WHERE id = $1`,
		l.ID, l.LobbyName, l.LobbyNumber, l.DayNumber,
		l.RoomID, l.RoomPassword, l.Status, l.ScheduledAt, l.StartedAt, l.CompletedAt)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *brLobbyRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM br_lobbies WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *brLobbyRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRLobby, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, lobby_name, lobby_number, day_number, room_id, room_password,
		        status, scheduled_at, started_at, completed_at
		 FROM br_lobbies WHERE tournament_id = $1
		 ORDER BY day_number ASC, lobby_number ASC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var lobbies []*model.BRLobby
	for rows.Next() {
		l := &model.BRLobby{}
		if err := rows.Scan(&l.ID, &l.TournamentID, &l.LobbyName, &l.LobbyNumber, &l.DayNumber,
			&l.RoomID, &l.RoomPassword, &l.Status, &l.ScheduledAt, &l.StartedAt, &l.CompletedAt); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		lobbies = append(lobbies, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return lobbies, nil
}

func (r *brLobbyRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE br_lobbies SET status = $2 WHERE id = $1`, id, status)
	if err != nil {
		return fmt.Errorf("UpdateStatus: %w", err)
	}
	return nil
}

func (r *brLobbyRepo) ListScheduledBefore(ctx context.Context, before time.Time) ([]*model.BRLobby, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, lobby_name, lobby_number, day_number,
		        room_id, room_password, status, scheduled_at, started_at, completed_at
		 FROM br_lobbies
		 WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= $1`, before)
	if err != nil {
		return nil, fmt.Errorf("ListScheduledBefore: %w", err)
	}
	defer rows.Close()

	var lobbies []*model.BRLobby
	for rows.Next() {
		l := &model.BRLobby{}
		if err := rows.Scan(&l.ID, &l.TournamentID, &l.LobbyName, &l.LobbyNumber, &l.DayNumber,
			&l.RoomID, &l.RoomPassword, &l.Status, &l.ScheduledAt, &l.StartedAt, &l.CompletedAt); err != nil {
			return nil, fmt.Errorf("ListScheduledBefore scan: %w", err)
		}
		lobbies = append(lobbies, l)
	}
	return lobbies, nil
}
