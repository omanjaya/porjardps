package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type SchoolService struct {
	schoolRepo model.SchoolRepository
}

func NewSchoolService(schoolRepo model.SchoolRepository) *SchoolService {
	return &SchoolService{schoolRepo: schoolRepo}
}

func (s *SchoolService) Create(ctx context.Context, name, level, city string, address *string) (*model.School, error) {
	school := &model.School{
		ID:        uuid.New(),
		Name:      name,
		Level:     level,
		City:      city,
		Address:   address,
		CreatedAt: time.Now(),
	}

	if err := s.schoolRepo.Create(ctx, school); err != nil {
		return nil, apperror.Wrap(err, "create school")
	}

	return school, nil
}

func (s *SchoolService) GetByID(ctx context.Context, id uuid.UUID) (*model.School, error) {
	school, err := s.schoolRepo.FindByID(ctx, id)
	if err != nil || school == nil {
		return nil, apperror.NotFound("SCHOOL")
	}
	return school, nil
}

func (s *SchoolService) Update(ctx context.Context, id uuid.UUID, name, level, city *string, address *string, logoURL *string) (*model.School, error) {
	school, err := s.schoolRepo.FindByID(ctx, id)
	if err != nil || school == nil {
		return nil, apperror.NotFound("SCHOOL")
	}

	if name != nil {
		school.Name = *name
	}
	if level != nil {
		school.Level = *level
	}
	if city != nil {
		school.City = *city
	}
	if address != nil {
		school.Address = address
	}
	if logoURL != nil {
		school.LogoURL = logoURL
	}

	if err := s.schoolRepo.Update(ctx, school); err != nil {
		return nil, apperror.Wrap(err, "update school")
	}

	return school, nil
}

func (s *SchoolService) List(ctx context.Context, filter model.SchoolFilter) ([]*model.School, int, error) {
	schools, total, err := s.schoolRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list schools")
	}
	return schools, total, nil
}

func (s *SchoolService) Delete(ctx context.Context, id uuid.UUID) error {
	school, err := s.schoolRepo.FindByID(ctx, id)
	if err != nil || school == nil {
		return apperror.NotFound("SCHOOL")
	}

	hasTeams, err := s.schoolRepo.HasTeams(ctx, id)
	if err != nil {
		return apperror.Wrap(err, "check school teams")
	}
	if hasTeams {
		return apperror.BusinessRule("SCHOOL_HAS_TEAMS", "Sekolah tidak dapat dihapus karena masih memiliki tim terdaftar")
	}

	return nil
}
