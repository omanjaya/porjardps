package handler

import (
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

// SearchPlayers returns a list of players (role=player) with minimal info.
// Supports ?search=<q>&not_in_game_id=<uuid> for assign-player UI.
func (h *AdminHandler) SearchPlayers(c *fiber.Ctx) error {
	role := model.RolePlayer
	filter := model.UserFilter{
		Role:  &role,
		Page:  1,
		Limit: 50,
	}
	if pp := c.Query("per_page"); pp != "" {
		if v, err := strconv.Atoi(pp); err == nil && v > 0 && v <= 100 {
			filter.Limit = v
		}
	}
	if search := c.Query("search"); len(search) >= 2 {
		filter.Search = &search
	}
	if gid := c.Query("not_in_game_id"); gid != "" {
		if id, err := uuid.Parse(gid); err == nil {
			filter.NotInGameID = &id
		}
	}

	users, total, err := h.userRepo.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "search players"))
	}

	type playerResult struct {
		ID       uuid.UUID `json:"id"`
		FullName string    `json:"full_name"`
		Email    string    `json:"email"`
	}
	results := make([]playerResult, 0, len(users))
	for _, u := range users {
		results = append(results, playerResult{ID: u.ID, FullName: u.FullName, Email: u.Email})
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, results, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	filter := model.UserFilter{
		Page:  1,
		Limit: 20,
	}

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 && v <= 10000 {
			filter.Page = v
		}
	}
	if pp := c.Query("per_page"); pp != "" {
		if v, err := strconv.Atoi(pp); err == nil && v > 0 && v <= 100 {
			filter.Limit = v
		}
	}
	if role := c.Query("role"); role != "" {
		filter.Role = &role
	}
	if search := c.Query("search"); len(search) >= 2 {
		filter.Search = &search
	}
	if c.Query("is_captain") == "true" {
		t := true
		filter.IsCaptain = &t
	}

	users, total, err := h.userRepo.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list users"))
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, users, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

type changeRoleRequest struct {
	Role string `json:"role"`
}

func (h *AdminHandler) ChangeUserRole(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req changeRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate role value
	validRoles := map[string]bool{model.RolePlayer: true, model.RoleCoach: true, model.RoleReferee: true, model.RoleAdmin: true, model.RoleSuperAdmin: true}
	if !validRoles[req.Role] {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"role": "Role harus salah satu dari: player, coach, referee, admin, superadmin",
		}))
	}

	// Only superadmins can promote to superadmin
	if req.Role == model.RoleSuperAdmin && middleware.GetUserRole(c) != model.RoleSuperAdmin {
		return response.Err(c, apperror.New("FORBIDDEN", "Hanya superadmin yang dapat mempromosikan ke superadmin", 403))
	}

	// Can't change own role
	currentUserID := middleware.GetUserID(c)
	if currentUserID == targetID {
		return response.Err(c, apperror.BusinessRule("CANNOT_CHANGE_OWN_ROLE", "Tidak dapat mengubah role sendiri"))
	}

	// Check target user exists
	targetUser, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || targetUser == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Can't demote last superadmin — use a Redis lock to prevent TOCTOU race.
	if targetUser.Role == model.RoleSuperAdmin && req.Role != model.RoleSuperAdmin {
		lockVal := uuid.New().String()
		set, err := h.rdb.SetNX(c.Context(), superadminLockKey, lockVal, superadminLockTTL).Result()
		if err != nil || !set {
			return response.Err(c, apperror.New("CONFLICT", "Operasi lain sedang berjalan, coba lagi", 409))
		}
		defer func() {
			// Release lock only if we still own it
			val, _ := h.rdb.Get(c.Context(), superadminLockKey).Result()
			if val == lockVal {
				h.rdb.Del(c.Context(), superadminLockKey)
			}
		}()
		count, err := h.userRepo.CountByRole(c.Context(), model.RoleSuperAdmin)
		if err != nil {
			return response.HandleError(c, apperror.Wrap(err, "count superadmins"))
		}
		if count <= 1 {
			return response.Err(c, apperror.BusinessRule("LAST_SUPERADMIN", "Tidak dapat menghapus superadmin terakhir"))
		}
	}

	if err := h.userRepo.UpdateRole(c.Context(), targetID, req.Role); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update user role"))
	}

	targetUser.Role = req.Role
	return response.OK(c, targetUser)
}

type createUserRequest struct {
	FullName          string  `json:"full_name"`
	Email             string  `json:"email"`
	Password          string  `json:"password"`
	Role              string  `json:"role"`
	Phone             *string `json:"phone"`
	Tingkat           *string `json:"tingkat"`
	NISN              *string `json:"nisn"`
	NomorPertandingan *string `json:"nomor_pertandingan"`
}

func (h *AdminHandler) CreateUser(c *fiber.Ctx) error {
	var req createUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate required fields
	errs := map[string]string{}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		errs["email"] = "Email wajib diisi"
	}
	if len(req.Password) < 8 {
		errs["password"] = "Password minimal 8 karakter"
	}
	validRoles := map[string]bool{model.RolePlayer: true, model.RoleCoach: true, model.RoleReferee: true, model.RoleAdmin: true}
	if !validRoles[req.Role] {
		errs["role"] = "Role harus salah satu dari: player, coach, referee, admin"
	}
	if req.FullName == "" {
		errs["full_name"] = "Nama lengkap wajib diisi"
	}
	if len(errs) > 0 {
		return response.Err(c, apperror.ValidationError(errs))
	}

	// Check email uniqueness
	existing, _ := h.userRepo.FindByEmail(c.Context(), req.Email)
	if existing != nil {
		return response.Err(c, apperror.Conflict("EMAIL_ALREADY_EXISTS", "Email sudah terdaftar"))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "hash password"))
	}

	now := time.Now()
	user := &model.User{
		ID:                uuid.New(),
		Email:             req.Email,
		PasswordHash:      string(hash),
		FullName:          req.FullName,
		Role:              req.Role,
		Phone:             req.Phone,
		Tingkat:           req.Tingkat,
		NISN:              req.NISN,
		NomorPertandingan: req.NomorPertandingan,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := h.userRepo.Create(c.Context(), user); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "create user"))
	}

	return response.Created(c, user)
}

type updateUserRequest struct {
	FullName          *string `json:"full_name"`
	Email             *string `json:"email"`
	Phone             *string `json:"phone"`
	Tingkat           *string `json:"tingkat"`
	NISN              *string `json:"nisn"`
	NomorPertandingan *string `json:"nomor_pertandingan"`
}

func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	user, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || user == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Track which fields are being changed for audit logging.
	changedFields := make(map[string]interface{})

	// Update fields that are provided
	if req.FullName != nil && *req.FullName != "" && *req.FullName != user.FullName {
		changedFields["full_name"] = map[string]string{"from": user.FullName, "to": *req.FullName}
		user.FullName = *req.FullName
	}
	if req.Email != nil && *req.Email != "" {
		newEmail := strings.TrimSpace(*req.Email)
		if newEmail != user.Email {
			existing, _ := h.userRepo.FindByEmail(c.Context(), newEmail)
			if existing != nil {
				return response.Err(c, apperror.Conflict("EMAIL_ALREADY_EXISTS", "Email sudah terdaftar"))
			}
			changedFields["email"] = map[string]string{"from": user.Email, "to": newEmail}
			user.Email = newEmail
		}
	}
	if req.Phone != nil {
		changedFields["phone"] = true
		user.Phone = req.Phone
	}
	if req.Tingkat != nil {
		changedFields["tingkat"] = true
		user.Tingkat = req.Tingkat
	}
	if req.NISN != nil {
		changedFields["nisn"] = true
		user.NISN = req.NISN
	}
	if req.NomorPertandingan != nil {
		changedFields["nomor_pertandingan"] = true
		// Empty string → clear field (set to nil)
		if *req.NomorPertandingan == "" {
			user.NomorPertandingan = nil
		} else {
			user.NomorPertandingan = req.NomorPertandingan
		}
	}

	user.UpdatedAt = time.Now()

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update user"))
	}

	// Fire-and-forget audit log of the admin update, including changed fields.
	adminID := middleware.GetUserID(c)
	audit.Log(c.Context(), audit.Entry{
		UserID:     &adminID,
		Action:     "user_updated",
		EntityType: "user",
		EntityID:   &user.ID,
		Details: map[string]interface{}{
			"target_user_id": user.ID.String(),
			"changed_fields": changedFields,
		},
	})

	return response.OK(c, user)
}

func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	// Can't delete yourself
	currentUserID := middleware.GetUserID(c)
	if currentUserID == targetID {
		return response.Err(c, apperror.BusinessRule("CANNOT_DELETE_SELF", "Tidak dapat menghapus akun sendiri"))
	}

	// Check target user exists
	targetUser, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || targetUser == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Don't allow deleting superadmin accounts
	if targetUser.Role == model.RoleSuperAdmin {
		return response.Err(c, apperror.BusinessRule("CANNOT_DELETE_SUPERADMIN", "Tidak dapat menghapus akun superadmin"))
	}

	if err := h.userRepo.Delete(c.Context(), targetID); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "delete user"))
	}

	return response.OK(c, fiber.Map{"message": "User berhasil dihapus"})
}
