package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Role constants for user roles used throughout the application.
const (
	RolePlayer     = "player"
	RoleCoach      = "coach"
	RoleReferee    = "referee"
	RoleAdmin      = "admin"
	RoleSuperAdmin = "superadmin"
)

type User struct {
	ID                              uuid.UUID  `json:"id"`
	Email                           string     `json:"email"`
	PasswordHash                    string     `json:"-"`
	FullName                        string     `json:"full_name"`
	Phone                           *string    `json:"phone"`
	Role                            string     `json:"role"`
	AvatarURL                       *string    `json:"avatar_url"`
	NISN                            *string    `json:"-" db:"nisn"`
	Tingkat                         *string    `json:"tingkat,omitempty"`
	NomorPertandingan               *string    `json:"nomor_pertandingan,omitempty"`
	NeedsPasswordChange             bool       `json:"needs_password_change"`
	EmailVerifiedAt                 *time.Time `json:"email_verified_at,omitempty" db:"email_verified_at"`
	EmailVerificationToken          *string    `json:"-" db:"email_verification_token"`
	EmailVerificationTokenExpiresAt *time.Time `json:"-" db:"email_verification_token_expires_at"`
	CreatedAt                       time.Time  `json:"created_at"`
	UpdatedAt                       time.Time  `json:"updated_at"`
}

type UserFilter struct {
	Role        *string
	Search      *string
	IsCaptain   *bool
	NotInGameID *uuid.UUID  // exclude users already in a team for this game
	EventIDs    []uuid.UUID // restrict to users participating in these events' tournaments; nil = no restriction
	Page        int
	Limit       int
}

type UserRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByNISN(ctx context.Context, nisn string) (*User, error)
	Create(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
	UpdateRole(ctx context.Context, id uuid.UUID, role string) error
	FindByEmailVerificationToken(ctx context.Context, token string) (*User, error)
	ConsumeEmailVerificationToken(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter UserFilter) ([]*User, int, error)
	ListByNISN(ctx context.Context, filter UserNISNFilter) ([]*User, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CountByRole(ctx context.Context, role string) (int, error)
}

type UserNISNFilter struct {
	Tingkat  *string
	GameSlug *string
	SchoolID *uuid.UUID
}

// UserPublicResponse is safe to return to any unauthenticated viewer.
// NISN, phone, and email are intentionally excluded per UU PDP.
type UserPublicResponse struct {
	ID        uuid.UUID `json:"id"`
	FullName  string    `json:"full_name"`
	AvatarURL *string   `json:"avatar_url"`
	Role      string    `json:"role"`
}

// UserProfileResponse is returned to the authenticated user themselves or an admin.
// NISN is intentionally excluded from all API responses per UU PDP.
type UserProfileResponse struct {
	ID                  uuid.UUID `json:"id"`
	FullName            string    `json:"full_name"`
	Email               string    `json:"email"`
	Phone               *string   `json:"phone,omitempty"`
	AvatarURL           *string   `json:"avatar_url"`
	Role                string    `json:"role"`
	Tingkat             *string   `json:"tingkat,omitempty"`
	NomorPertandingan   *string   `json:"nomor_pertandingan,omitempty"`
	NisnSet             bool      `json:"nisn_set"`
	NeedsPasswordChange bool      `json:"needs_password_change"`
	EmailVerified       bool      `json:"email_verified"`
	CreatedAt           time.Time `json:"created_at"`
}

// ToPublic converts a User to a safe public response (no contact info).
func (u *User) ToPublic() UserPublicResponse {
	return UserPublicResponse{
		ID:        u.ID,
		FullName:  u.FullName,
		AvatarURL: u.AvatarURL,
		Role:      u.Role,
	}
}

// ToProfile converts a User to a profile response for self/admin use.
func (u *User) ToProfile() UserProfileResponse {
	return UserProfileResponse{
		ID:                  u.ID,
		FullName:            u.FullName,
		Email:               u.Email,
		Phone:               u.Phone,
		AvatarURL:           u.AvatarURL,
		Role:                u.Role,
		Tingkat:             u.Tingkat,
		NomorPertandingan:   u.NomorPertandingan,
		NisnSet:             u.NISN != nil && *u.NISN != "",
		NeedsPasswordChange: u.NeedsPasswordChange,
		EmailVerified:       u.EmailVerifiedAt != nil,
		CreatedAt:           u.CreatedAt,
	}
}
