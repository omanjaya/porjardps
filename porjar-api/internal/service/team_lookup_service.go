package service

import (
	"context"

	"github.com/porjar-denpasar/porjar-api/internal/model"
)

func (s *TeamService) FindGameBySlug(ctx context.Context, slug string) (*model.Game, error) {
	return s.gameRepo.FindBySlug(ctx, slug)
}
