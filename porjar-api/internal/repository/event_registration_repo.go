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

type eventRegistrationRepo struct {
	db *pgxpool.Pool
}

func NewEventRegistrationRepo(db *pgxpool.Pool) model.EventRegistrationRepository {
	return &eventRegistrationRepo{db: db}
}

func (r *eventRegistrationRepo) Create(ctx context.Context, reg *model.EventRegistration) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO event_registrations (id, event_id, team_id, registered_at)
		 VALUES ($1, $2, $3, $4)`,
		reg.ID, reg.EventID, reg.TeamID, reg.RegisteredAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *eventRegistrationRepo) Delete(ctx context.Context, eventID, teamID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM event_registrations WHERE event_id = $1 AND team_id = $2`,
		eventID, teamID)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *eventRegistrationRepo) FindByEventAndTeam(ctx context.Context, eventID, teamID uuid.UUID) (*model.EventRegistration, error) {
	reg := &model.EventRegistration{}
	err := r.db.QueryRow(ctx,
		`SELECT id, event_id, team_id, registered_at
		 FROM event_registrations WHERE event_id = $1 AND team_id = $2`,
		eventID, teamID).
		Scan(&reg.ID, &reg.EventID, &reg.TeamID, &reg.RegisteredAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByEventAndTeam: %w", err)
	}
	return reg, nil
}

func (r *eventRegistrationRepo) FindByEventAndSchool(ctx context.Context, eventID, schoolID uuid.UUID) (*model.EventRegistration, error) {
	reg := &model.EventRegistration{}
	err := r.db.QueryRow(ctx,
		`SELECT er.id, er.event_id, er.team_id, er.registered_at
		 FROM event_registrations er
		 JOIN teams t ON t.id = er.team_id
		 WHERE er.event_id = $1 AND t.school_id = $2
		 LIMIT 1`,
		eventID, schoolID).
		Scan(&reg.ID, &reg.EventID, &reg.TeamID, &reg.RegisteredAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByEventAndSchool: %w", err)
	}
	return reg, nil
}

func (r *eventRegistrationRepo) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*model.EventRegistration, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, event_id, team_id, registered_at
		 FROM event_registrations WHERE event_id = $1
		 ORDER BY registered_at ASC`, eventID)
	if err != nil {
		return nil, fmt.Errorf("ListByEvent: %w", err)
	}
	defer rows.Close()

	var regs []*model.EventRegistration
	for rows.Next() {
		reg := &model.EventRegistration{}
		if err := rows.Scan(&reg.ID, &reg.EventID, &reg.TeamID, &reg.RegisteredAt); err != nil {
			return nil, fmt.Errorf("ListByEvent scan: %w", err)
		}
		regs = append(regs, reg)
	}
	return regs, rows.Err()
}

func (r *eventRegistrationRepo) ListByEventWithTeams(ctx context.Context, eventID uuid.UUID) ([]*model.EventRegistrationWithTeam, error) {
	rows, err := r.db.Query(ctx,
		`SELECT er.id, er.event_id, er.registered_at,
		        t.id, t.name, t.seed, t.logo_url,
		        s.logo_url, s.name
		 FROM event_registrations er
		 JOIN teams t ON t.id = er.team_id
		 LEFT JOIN schools s ON s.id = t.school_id
		 WHERE er.event_id = $1
		 ORDER BY er.registered_at ASC`, eventID)
	if err != nil {
		return nil, fmt.Errorf("ListByEventWithTeams: %w", err)
	}
	defer rows.Close()

	var regs []*model.EventRegistrationWithTeam
	for rows.Next() {
		reg := &model.EventRegistrationWithTeam{}
		if err := rows.Scan(
			&reg.ID, &reg.EventID, &reg.RegisteredAt,
			&reg.Team.ID, &reg.Team.Name, &reg.Team.Seed, &reg.Team.LogoURL,
			&reg.Team.SchoolLogoURL, &reg.Team.SchoolName,
		); err != nil {
			return nil, fmt.Errorf("ListByEventWithTeams scan: %w", err)
		}
		regs = append(regs, reg)
	}
	return regs, rows.Err()
}

func (r *eventRegistrationRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.MyEventRegistration, error) {
	rows, err := r.db.Query(ctx,
		`SELECT er.id, er.event_id, e.name, e.slug, e.status, e.start_date,
		        er.team_id, t.name, er.registered_at
		 FROM event_registrations er
		 JOIN events e ON e.id = er.event_id
		 JOIN teams t ON t.id = er.team_id
		 JOIN team_members tm ON tm.team_id = t.id
		 WHERE tm.user_id = $1
		 ORDER BY er.registered_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("ListByUser: %w", err)
	}
	defer rows.Close()

	var regs []*model.MyEventRegistration
	for rows.Next() {
		r := &model.MyEventRegistration{}
		if err := rows.Scan(
			&r.ID, &r.EventID, &r.EventName, &r.EventSlug, &r.EventStatus, &r.EventStartDate,
			&r.TeamID, &r.TeamName, &r.RegisteredAt,
		); err != nil {
			return nil, fmt.Errorf("ListByUser scan: %w", err)
		}
		regs = append(regs, r)
	}
	return regs, rows.Err()
}

func (r *eventRegistrationRepo) CountByEvent(ctx context.Context, eventID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM event_registrations WHERE event_id = $1`, eventID).
		Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountByEvent: %w", err)
	}
	return count, nil
}
