package service

import (
	"context"

	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
)

type SiteSettingsService struct {
	repo *repository.SiteSettingsRepo
}

func NewSiteSettingsService(repo *repository.SiteSettingsRepo) *SiteSettingsService {
	return &SiteSettingsService{repo: repo}
}

func (s *SiteSettingsService) Get(ctx context.Context) (*model.SiteSettings, error) {
	return s.repo.Get(ctx)
}

func (s *SiteSettingsService) Update(ctx context.Context, settings *model.SiteSettings) (*model.SiteSettings, error) {
	return s.repo.Update(ctx, settings)
}
