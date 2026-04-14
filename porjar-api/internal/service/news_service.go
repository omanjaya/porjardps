package service

import (
	"context"
	"time"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
)

type NewsService struct {
	repo *repository.NewsRepository
}

func NewNewsService(repo *repository.NewsRepository) *NewsService {
	return &NewsService{repo: repo}
}

func (s *NewsService) List(ctx context.Context, page, perPage int) ([]*model.News, int, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage
	return s.repo.List(ctx, perPage, offset)
}

func (s *NewsService) GetByID(ctx context.Context, id int64) (*model.News, error) {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, apperror.Wrap(err, "news get by id")
	}
	if n == nil {
		return nil, apperror.NotFound("NEWS")
	}
	return n, nil
}

func (s *NewsService) GetBySlug(ctx context.Context, slug string) (*model.News, error) {
	n, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, apperror.Wrap(err, "news get by slug")
	}
	if n == nil {
		return nil, apperror.NotFound("NEWS")
	}
	return n, nil
}

func (s *NewsService) Create(ctx context.Context, n *model.News) error {
	if n.PublishedAt.IsZero() {
		n.PublishedAt = time.Now()
	}
	if n.Category == "" {
		n.Category = "Berita"
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return apperror.Wrap(err, "news create")
	}
	return nil
}

func (s *NewsService) Update(ctx context.Context, n *model.News) error {
	existing, err := s.repo.GetByID(ctx, n.ID)
	if err != nil {
		return apperror.Wrap(err, "news update lookup")
	}
	if existing == nil {
		return apperror.NotFound("NEWS")
	}
	if err := s.repo.Update(ctx, n); err != nil {
		return apperror.Wrap(err, "news update")
	}
	return nil
}

func (s *NewsService) Delete(ctx context.Context, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return apperror.Wrap(err, "news delete")
	}
	return nil
}
