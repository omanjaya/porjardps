package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
)

type SchoolRequestService struct {
	requestRepo model.SchoolRequestRepository
	schoolRepo  model.SchoolRepository
}

func NewSchoolRequestService(requestRepo model.SchoolRequestRepository, schoolRepo model.SchoolRepository) *SchoolRequestService {
	return &SchoolRequestService{requestRepo: requestRepo, schoolRepo: schoolRepo}
}

func (s *SchoolRequestService) Create(ctx context.Context, name, level string, userID uuid.UUID) (*model.SchoolRequest, error) {
	// Check for existing pending request by this user
	existing, err := s.requestRepo.FindPendingByUser(ctx, userID)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing request")
	}
	if existing != nil {
		return nil, apperror.BusinessRule("DUPLICATE_REQUEST", "Kamu sudah memiliki permintaan sekolah yang menunggu persetujuan")
	}

	// Check if school with same name+level already exists
	existingSchool, err := s.schoolRepo.FindByNameAndLevel(ctx, name, level)
	if err != nil {
		return nil, apperror.Wrap(err, "check existing school")
	}
	if existingSchool != nil {
		return nil, apperror.Conflict("SCHOOL_EXISTS", "Sekolah dengan nama dan jenjang tersebut sudah terdaftar")
	}

	sr := &model.SchoolRequest{
		ID:          uuid.New(),
		Name:        name,
		Level:       level,
		RequestedBy: userID,
		Status:      "pending",
		CreatedAt:   time.Now(),
	}

	if err := s.requestRepo.Create(ctx, sr); err != nil {
		return nil, apperror.Wrap(err, "create school request")
	}

	audit.Log(ctx, audit.Entry{
		UserID:     &userID,
		Action:     "school_request_created",
		EntityType: "school_request",
		EntityID:   &sr.ID,
		Details:    map[string]interface{}{"name": name, "level": level},
	})

	return sr, nil
}

func (s *SchoolRequestService) List(ctx context.Context, filter model.SchoolRequestFilter) ([]*model.SchoolRequest, int, error) {
	return s.requestRepo.List(ctx, filter)
}

func (s *SchoolRequestService) Approve(ctx context.Context, requestID uuid.UUID, city string) (*model.School, error) {
	sr, err := s.requestRepo.FindByID(ctx, requestID)
	if err != nil || sr == nil {
		return nil, apperror.NotFound("SCHOOL_REQUEST")
	}
	if sr.Status != "pending" {
		return nil, apperror.BusinessRule("ALREADY_REVIEWED", "Permintaan sudah diproses")
	}

	// Create the school
	school := &model.School{
		ID:        uuid.New(),
		Name:      sr.Name,
		Level:     sr.Level,
		City:      city,
		CreatedAt: time.Now(),
	}
	if err := s.schoolRepo.Create(ctx, school); err != nil {
		return nil, apperror.Wrap(err, "create school from request")
	}

	// Update request status
	now := time.Now()
	if err := s.requestRepo.UpdateStatus(ctx, requestID, "approved", nil, &school.ID, now); err != nil {
		return nil, apperror.Wrap(err, "approve request")
	}

	return school, nil
}

func (s *SchoolRequestService) Reject(ctx context.Context, requestID uuid.UUID, reason string) error {
	sr, err := s.requestRepo.FindByID(ctx, requestID)
	if err != nil || sr == nil {
		return apperror.NotFound("SCHOOL_REQUEST")
	}
	if sr.Status != "pending" {
		return apperror.BusinessRule("ALREADY_REVIEWED", "Permintaan sudah diproses")
	}

	now := time.Now()
	if err := s.requestRepo.UpdateStatus(ctx, requestID, "rejected", &reason, nil, now); err != nil {
		return apperror.Wrap(err, "reject school request")
	}

	audit.Log(ctx, audit.Entry{
		Action:     "school_request_rejected",
		EntityType: "school_request",
		EntityID:   &requestID,
		Details:    map[string]interface{}{"name": sr.Name, "reason": reason},
	})
	return nil
}
