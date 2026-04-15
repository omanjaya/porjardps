package handler

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/credcrypto"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

func (h *AdminHandler) ResetUserPassword(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	// Check target user exists
	user, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || user == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Generate random 8-char password (reuses generateRandomPassword from import_handler.go)
	plainPassword, err := generateRandomPassword()
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate password"))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "hash password"))
	}

	user.PasswordHash = string(hash)
	user.NeedsPasswordChange = false
	user.UpdatedAt = time.Now()

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update user password"))
	}

	// Store plain password in Redis so credential card can display it
	credcrypto.StoreCredPassword(c.Context(), h.rdb, h.encKey, targetID, plainPassword)

	slog.Info("admin credential reset", "admin_id", c.Locals("userID"), "target_user_id", targetID)

	return response.OK(c, fiber.Map{
		"message":  "Password berhasil direset",
		"password": plainPassword,
	})
}

type userCredentialResponse struct {
	FullName    string `json:"full_name"`
	NISN        string `json:"nisn"`
	SchoolName  string `json:"school_name"`
	TeamName    string `json:"team_name"`
	GameDisplay string `json:"game_display"`
	MemberRole  string `json:"member_role"`
	Password    string `json:"password"`
}

func (h *AdminHandler) GetUserCredential(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	slog.Info("admin credential accessed", "admin_id", c.Locals("userID"), "target_user_id", targetID)

	user, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || user == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	nisn := ""
	if user.NISN != nil {
		nisn = *user.NISN
	}

	cred := userCredentialResponse{
		FullName: user.FullName,
		NISN:     nisn,
	}

	// Populate team/school info from first team membership
	memberships, err := h.teamMemberRepo.FindByUser(c.Context(), targetID)
	if err == nil && len(memberships) > 0 {
		first := memberships[0]
		cred.MemberRole = first.Role
		team, err := h.teamRepo.FindByID(c.Context(), first.TeamID)
		if err == nil && team != nil {
			cred.TeamName = team.Name
			if team.SchoolName != nil {
				cred.SchoolName = *team.SchoolName
			}
			// Resolve game display name
			games, _ := h.gameRepo.List(c.Context())
			for _, g := range games {
				if g.ID == team.GameID {
					cred.GameDisplay = g.Name
					break
				}
			}
		}
	}

	// Retrieve plain password from Redis; if not found, auto-reset so card always shows a password
	cred.Password = credcrypto.GetCredPassword(c.Context(), h.rdb, h.encKey, targetID)
	if cred.Password == "" {
		plain, err := generateRandomPassword()
		if err != nil {
			return response.HandleError(c, apperror.Wrap(err, "generate password"))
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
		if err != nil {
			return response.HandleError(c, apperror.Wrap(err, "hash password"))
		}
		user.PasswordHash = string(hash)
		user.NeedsPasswordChange = false
		user.UpdatedAt = time.Now()
		if err := h.userRepo.Update(c.Context(), user); err != nil {
			return response.HandleError(c, apperror.Wrap(err, "update user password"))
		}
		credcrypto.StoreCredPassword(c.Context(), h.rdb, h.encKey, targetID, plain)
		cred.Password = plain
	}

	return response.OK(c, cred)
}
