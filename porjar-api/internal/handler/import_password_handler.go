package handler

import (
	"crypto/rand"
	"math/big"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/credcrypto"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

// ResetSchoolPasswords resets passwords for all NISN-based users in a school.
// Generates new random passwords, updates bcrypt hashes in DB, and stores
// encrypted passwords in Redis so the credential PDF can display them.
// NOTE: Plaintext credentials are returned in the response body — ensure HTTPS is enforced at the proxy layer.
// POST /admin/import/credentials/reset-school
// Body: { "school_id": "uuid" }
func (h *ImportHandler) ResetSchoolPasswords(c *fiber.Ctx) error {
	var body struct {
		SchoolID string `json:"school_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "Body tidak valid")
	}
	if body.SchoolID == "" {
		return response.BadRequest(c, "school_id wajib diisi")
	}

	schoolUUID, err := uuid.Parse(body.SchoolID)
	if err != nil {
		return response.BadRequest(c, "school_id tidak valid")
	}

	school, err := h.schoolRepo.FindByID(c.Context(), schoolUUID)
	if err != nil || school == nil {
		return response.BadRequest(c, "Sekolah tidak ditemukan")
	}

	users, err := h.userRepo.ListByNISN(c.Context(), model.UserNISNFilter{SchoolID: &schoolUUID})
	if err != nil {
		return response.BadRequest(c, "Gagal mengambil data pengguna")
	}

	type resetEntry struct {
		FullName string `json:"full_name"`
		NISN     string `json:"nisn"`
		Password string `json:"password"`
	}
	var reset []resetEntry
	skipped := 0

	for _, u := range users {
		if u.NISN == nil {
			skipped++
			continue
		}

		plain, err := generateRandomPassword()
		if err != nil {
			skipped++
			continue
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
		if err != nil {
			skipped++
			continue
		}

		u.PasswordHash = string(hash)
		u.NeedsPasswordChange = false
		u.UpdatedAt = time.Now()
		if err := h.userRepo.Update(c.Context(), u); err != nil {
			skipped++
			continue
		}

		credcrypto.StoreCredPassword(c.Context(), h.rdb, h.encKey, u.ID, plain)

		reset = append(reset, resetEntry{
			FullName: u.FullName,
			NISN:     *u.NISN,
			Password: plain,
		})
	}

	return response.OK(c, fiber.Map{
		"school":  school.Name,
		"reset":   len(reset),
		"skipped": skipped,
		"entries": reset,
	})
}

// generateRandomPassword creates a cryptographically random 8-character
// password guaranteed to contain at least 1 lowercase letter and 1 digit.
func generateRandomPassword() (string, error) {
	const letters = "abcdefghijkmnpqrstuvwxyz"
	const digits = "23456789"
	const charset = letters + digits

	randByte := func(from string) (byte, error) {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(from))))
		if err != nil {
			return 0, err
		}
		return from[idx.Int64()], nil
	}

	result := make([]byte, 8)
	// Guarantee at least one letter and one digit
	var err error
	result[0], err = randByte(letters)
	if err != nil {
		return "", err
	}
	result[1], err = randByte(digits)
	if err != nil {
		return "", err
	}
	// Fill remaining 6 positions from full charset
	for i := 2; i < 8; i++ {
		result[i], err = randByte(charset)
		if err != nil {
			return "", err
		}
	}
	// Shuffle with Fisher-Yates using crypto/rand
	for i := 7; i > 0; i-- {
		jBig, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			return "", err
		}
		j := jBig.Int64()
		result[i], result[j] = result[j], result[i]
	}
	return string(result), nil
}
