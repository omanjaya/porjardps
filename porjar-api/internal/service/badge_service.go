package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type BadgeService struct {
	badgeRepo model.BadgeRepository
}

func NewBadgeService(badgeRepo model.BadgeRepository) *BadgeService {
	return &BadgeService{badgeRepo: badgeRepo}
}

// ListAll returns all available badges.
func (s *BadgeService) ListAll(ctx context.Context) ([]*model.Badge, error) {
	badges, err := s.badgeRepo.ListAll(ctx)
	if err != nil {
		return nil, apperror.Wrap(err, "list all badges")
	}
	return badges, nil
}

// GetUserBadges returns all badges earned by a user.
func (s *BadgeService) GetUserBadges(ctx context.Context, userID uuid.UUID) ([]*model.UserBadge, error) {
	badges, err := s.badgeRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "get user badges")
	}
	return badges, nil
}

// AwardBySlug awards a badge to a user by slug. Admin-only manual award.
func (s *BadgeService) AwardBySlug(ctx context.Context, userID uuid.UUID, slug string) error {
	badge, err := s.badgeRepo.FindBySlug(ctx, slug)
	if err != nil {
		return apperror.Wrap(err, "find badge by slug")
	}
	if badge == nil {
		return apperror.NotFound("badge")
	}

	if err := s.badgeRepo.AwardBadge(ctx, userID, badge.ID); err != nil {
		return apperror.Wrap(err, "award badge")
	}
	return nil
}

// AwardIfEligible checks whether a user should receive a badge for the given
// trigger event and awards it if not already earned. This is designed to be
// called fire-and-forget from service hooks — errors are logged, never
// returned. The background context ensures the DB write isn't cancelled when
// the HTTP handler returns.
func (s *BadgeService) AwardIfEligible(ctx context.Context, userID uuid.UUID, triggerEvent string) {
	// Map trigger events to badge slugs. Some triggers may map to multiple
	// badges (e.g. match completion checks both first-match and first-win).
	slugs := triggerToSlugs(triggerEvent)
	if len(slugs) == 0 {
		return
	}

	bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	for _, slug := range slugs {
		badge, err := s.badgeRepo.FindBySlug(bgCtx, slug)
		if err != nil || badge == nil {
			if err != nil {
				slog.Warn("badge lookup failed", "slug", slug, "error", err)
			}
			continue
		}

		has, err := s.badgeRepo.HasBadge(bgCtx, userID, badge.ID)
		if err != nil {
			slog.Warn("badge check failed", "slug", slug, "error", err)
			continue
		}
		if has {
			continue
		}

		if err := s.badgeRepo.AwardBadge(bgCtx, userID, badge.ID); err != nil {
			slog.Warn("badge award failed", "slug", slug, "user_id", userID, "error", err)
		} else {
			slog.Info("badge awarded", "slug", slug, "user_id", userID)
		}
	}
}

// triggerToSlugs maps a trigger event string to the badge slugs it can award.
func triggerToSlugs(trigger string) []string {
	switch trigger {
	case "first-login":
		return []string{"first-login"}
	case "profile-complete":
		return []string{"profile-complete"}
	case "first-team":
		return []string{"first-team"}
	case "first-event":
		return []string{"first-event"}
	case "first-match":
		return []string{"first-match"}
	case "first-win":
		return []string{"first-win"}
	case "five-wins":
		return []string{"five-wins"}
	case "champion":
		return []string{"champion"}
	case "sportsmanship":
		return []string{"sportsmanship"}
	case "early-bird":
		return []string{"early-bird"}
	default:
		return nil
	}
}
