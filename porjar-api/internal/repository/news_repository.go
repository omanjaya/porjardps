package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type NewsRepository struct {
	db *pgxpool.Pool
}

func NewNewsRepository(db *pgxpool.Pool) *NewsRepository {
	return &NewsRepository{db: db}
}

const newsColumns = `id, title, slug, excerpt, content, category, image_url, published_at, created_at, updated_at`

func scanNews(row pgx.Row) (*model.News, error) {
	n := &model.News{}
	err := row.Scan(
		&n.ID, &n.Title, &n.Slug, &n.Excerpt, &n.Content, &n.Category,
		&n.ImageURL, &n.PublishedAt, &n.CreatedAt, &n.UpdatedAt,
	)
	return n, err
}

func (r *NewsRepository) List(ctx context.Context, limit, offset int) ([]*model.News, int, error) {
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM news`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("news count: %w", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT `+newsColumns+` FROM news ORDER BY published_at DESC LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("news list: %w", err)
	}
	defer rows.Close()

	var items []*model.News
	for rows.Next() {
		n := &model.News{}
		if err := rows.Scan(
			&n.ID, &n.Title, &n.Slug, &n.Excerpt, &n.Content, &n.Category,
			&n.ImageURL, &n.PublishedAt, &n.CreatedAt, &n.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("news scan: %w", err)
		}
		items = append(items, n)
	}
	return items, total, rows.Err()
}

func (r *NewsRepository) GetByID(ctx context.Context, id int64) (*model.News, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+newsColumns+` FROM news WHERE id = $1`, id)
	n, err := scanNews(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("news GetByID: %w", err)
	}
	return n, nil
}

func (r *NewsRepository) GetBySlug(ctx context.Context, slug string) (*model.News, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+newsColumns+` FROM news WHERE slug = $1`, slug)
	n, err := scanNews(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("news GetBySlug: %w", err)
	}
	return n, nil
}

func (r *NewsRepository) Create(ctx context.Context, n *model.News) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO news (title, slug, excerpt, content, category, image_url, published_at)
		 VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
		 RETURNING id, created_at, updated_at, published_at`,
		n.Title, n.Slug, n.Excerpt, n.Content, n.Category, n.ImageURL, n.PublishedAt,
	).Scan(&n.ID, &n.CreatedAt, &n.UpdatedAt, &n.PublishedAt)
}

func (r *NewsRepository) Update(ctx context.Context, n *model.News) error {
	_, err := r.db.Exec(ctx,
		`UPDATE news SET title = $2, slug = $3, excerpt = $4, content = $5,
			category = $6, image_url = $7, published_at = $8, updated_at = NOW()
		 WHERE id = $1`,
		n.ID, n.Title, n.Slug, n.Excerpt, n.Content, n.Category, n.ImageURL, n.PublishedAt)
	if err != nil {
		return fmt.Errorf("news Update: %w", err)
	}
	return nil
}

func (r *NewsRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM news WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("news Delete: %w", err)
	}
	return nil
}
