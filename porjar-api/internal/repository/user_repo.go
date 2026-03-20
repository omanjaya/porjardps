package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type userRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) model.UserRepository {
	return &userRepo{db: db}
}

const userColumns = `id, email, password_hash, full_name, phone, role, avatar_url, nisn, tingkat, nomor_pertandingan, needs_password_change, created_at, updated_at`

func scanUser(row pgx.Row) (*model.User, error) {
	u := &model.User{}
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone, &u.Role, &u.AvatarURL,
		&u.NISN, &u.Tingkat, &u.NomorPertandingan, &u.NeedsPasswordChange, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return u, nil
}

func (r *userRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	u, err := scanUser(r.db.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = $1`, id))
	if err != nil {
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return u, nil
}

func (r *userRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.User, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.db.Query(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, fmt.Errorf("FindByIDs: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone, &u.Role, &u.AvatarURL,
			&u.NISN, &u.Tingkat, &u.NomorPertandingan, &u.NeedsPasswordChange, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("FindByIDs scan: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByIDs rows: %w", err)
	}
	return users, nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	u, err := scanUser(r.db.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE email = $1`, email))
	if err != nil {
		return nil, fmt.Errorf("FindByEmail: %w", err)
	}
	return u, nil
}

func (r *userRepo) FindByNISN(ctx context.Context, nisn string) (*model.User, error) {
	u, err := scanUser(r.db.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE nisn = $1`, nisn))
	if err != nil {
		return nil, fmt.Errorf("FindByNISN: %w", err)
	}
	return u, nil
}

func (r *userRepo) Create(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url, nisn, tingkat, nomor_pertandingan, needs_password_change, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		u.ID, u.Email, u.PasswordHash, u.FullName, u.Phone, u.Role, u.AvatarURL,
		u.NISN, u.Tingkat, u.NomorPertandingan, u.NeedsPasswordChange, u.CreatedAt, u.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *userRepo) Update(ctx context.Context, u *model.User) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET email = $2, full_name = $3, phone = $4, avatar_url = $5, password_hash = $6,
		 nisn = $7, tingkat = $8, nomor_pertandingan = $9, needs_password_change = $10, updated_at = $11
		 WHERE id = $1`,
		u.ID, u.Email, u.FullName, u.Phone, u.AvatarURL, u.PasswordHash,
		u.NISN, u.Tingkat, u.NomorPertandingan, u.NeedsPasswordChange, u.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *userRepo) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET password_hash = $2, needs_password_change = false, updated_at = NOW() WHERE id = $1`,
		id, passwordHash)
	if err != nil {
		return fmt.Errorf("UpdatePassword: %w", err)
	}
	return nil
}

func (r *userRepo) UpdateRole(ctx context.Context, id uuid.UUID, role string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1`, id, role)
	if err != nil {
		return fmt.Errorf("UpdateRole: %w", err)
	}
	return nil
}

func (r *userRepo) List(ctx context.Context, filter model.UserFilter) ([]*model.User, int, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	if filter.Role != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("role = $%d", argIdx))
		args = append(args, *filter.Role)
	}
	if filter.Search != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("(full_name ILIKE $%d OR email ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+*filter.Search+"%")
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM users"+where, args...).Scan(&total)
	if err != nil {
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
	limitArg := fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", argIdx)
	args = append(args, filter.Limit)
	argIdx++
	limitArg += fmt.Sprintf(" OFFSET $%d", argIdx)
	args = append(args, offset)

	query := `SELECT ` + userColumns + ` FROM users` + where + limitArg

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("List query: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone, &u.Role, &u.AvatarURL,
			&u.NISN, &u.Tingkat, &u.NomorPertandingan, &u.NeedsPasswordChange, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("List scan: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("List rows: %w", err)
	}

	return users, total, nil
}

func (r *userRepo) ListByNISN(ctx context.Context, filter model.UserNISNFilter) ([]*model.User, error) {
	var (
		conditions []string
		args       []interface{}
		argIdx     int
	)

	// Only NISN users
	conditions = append(conditions, "nisn IS NOT NULL")

	if filter.Tingkat != nil {
		argIdx++
		conditions = append(conditions, fmt.Sprintf("tingkat = $%d", argIdx))
		args = append(args, *filter.Tingkat)
	}

	where := " WHERE " + strings.Join(conditions, " AND ")

	query := `SELECT ` + userColumns + ` FROM users` + where + ` ORDER BY full_name ASC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ListByNISN query: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone, &u.Role, &u.AvatarURL,
			&u.NISN, &u.Tingkat, &u.NomorPertandingan, &u.NeedsPasswordChange, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("ListByNISN scan: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByNISN rows: %w", err)
	}

	return users, nil
}

func (r *userRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *userRepo) CountByRole(ctx context.Context, role string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = $1`, role).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountByRole: %w", err)
	}
	return count, nil
}
