package handler

import (
	"bytes"
	"crypto/rand"
	"encoding/csv"
	"fmt"
	"io"
	"math/big"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

// generateRandomPassword creates a cryptographically random 8-character
// alphanumeric password using crypto/rand.
func generateRandomPassword() (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, 8)
	for i := range result {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		result[i] = charset[idx.Int64()]
	}
	return string(result), nil
}

func (h *ImportHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Post("/admin/import/schools", authMw, adminMw, h.ImportSchools)
	app.Post("/admin/import/teams", authMw, adminMw, h.ImportTeams)
	app.Post("/admin/import/participants", authMw, adminMw, h.ImportParticipants)
	app.Get("/admin/import/credentials", authMw, adminMw, h.ExportCredentials)
	app.Get("/admin/import/credentials/pdf", authMw, adminMw, h.ExportCredentialsPDF)
	app.Post("/admin/import/credentials/link", authMw, adminMw, h.GenerateCredentialLink)

	// Public credential download — no auth required (token is the auth)
	app.Get("/public/credentials/:token", h.PublicCredentialDownload)
}

// ImportParticipants handles bulk CSV import of participants with NISN-based login.
// POST /admin/import/participants
func (h *ImportHandler) ImportParticipants(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "File CSV wajib diunggah")
	}

	f, err := file.Open()
	if err != nil {
		return response.BadRequest(c, "Gagal membaca file")
	}
	defer f.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, f); err != nil {
		return response.BadRequest(c, "Gagal membaca file")
	}

	reader := csv.NewReader(bytes.NewReader(buf.Bytes()))
	reader.TrimLeadingSpace = true

	// Read header
	header, err := reader.Read()
	if err != nil {
		return response.BadRequest(c, "File CSV kosong atau format tidak valid")
	}

	colIdx := map[string]int{}
	for i, col := range header {
		colIdx[strings.ToLower(strings.TrimSpace(col))] = i
	}

	// Required columns
	requiredCols := []string{"nama", "nisn", "tingkat", "nomor_pertandingan", "sekolah", "role"}
	for _, col := range requiredCols {
		if _, ok := colIdx[col]; !ok {
			return response.BadRequest(c, fmt.Sprintf("CSV harus memiliki kolom '%s'", col))
		}
	}

	namaIdx := colIdx["nama"]
	nisnIdx := colIdx["nisn"]
	tingkatIdx := colIdx["tingkat"]
	nomorIdx := colIdx["nomor_pertandingan"]
	sekolahIdx := colIdx["sekolah"]
	roleIdx := colIdx["role"]
	namaTimIdx, hasNamaTim := colIdx["nama_tim"]

	// Caches
	gameCache := map[string]*model.Game{}
	schoolCache := map[string]*model.School{} // key: name|level
	teamCache := map[string]*model.Team{}     // key: teamName|gameID
	createdUsers := map[string]bool{}
	createdTeams := map[string]bool{}
	generatedPasswords := map[string]string{} // NISN -> plaintext password (shown once)

	result := participantImportResult{}
	lineNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		lineNum++
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: format tidak valid", lineNum))
			result.Skipped++
			continue
		}

		// Parse fields
		nama := strings.TrimSpace(record[namaIdx])
		nisn := strings.TrimSpace(record[nisnIdx])
		tingkat := strings.ToUpper(strings.TrimSpace(record[tingkatIdx]))
		nomorPertandingan := strings.TrimSpace(record[nomorIdx])
		sekolah := strings.TrimSpace(record[sekolahIdx])
		csvRole := strings.ToLower(strings.TrimSpace(record[roleIdx]))

		namaTim := ""
		if hasNamaTim && namaTimIdx < len(record) {
			namaTim = strings.TrimSpace(record[namaTimIdx])
		}

		// Validate required fields
		if nama == "" || nisn == "" || tingkat == "" || nomorPertandingan == "" || sekolah == "" || csvRole == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: semua kolom wajib diisi", lineNum))
			result.Skipped++
			continue
		}

		// Validate tingkat
		validTingkat := map[string]bool{"SD": true, "SMP": true, "SMA": true}
		if !validTingkat[tingkat] {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: tingkat harus SD/SMP/SMA", lineNum))
			result.Skipped++
			continue
		}

		// Validate role
		if csvRole != "ketua" && csvRole != "anggota" {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: role harus 'ketua' atau 'anggota'", lineNum))
			result.Skipped++
			continue
		}

		// Map nomor_pertandingan to game slug
		nomorLower := strings.ToLower(nomorPertandingan)
		gameSlug, ok := nomorPertandinganToSlug[nomorLower]
		if !ok {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: nomor_pertandingan '%s' tidak dikenali", lineNum, nomorPertandingan))
			result.Skipped++
			continue
		}

		// For eFootball Solo: if nama_tim is empty, use player nama
		isEfootballSolo := nomorLower == "efootball solo"
		if isEfootballSolo && namaTim == "" {
			namaTim = nama
		}

		// Validate nama_tim for non-solo games
		if namaTim == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: nama_tim wajib diisi untuk %s", lineNum, nomorPertandingan))
			result.Skipped++
			continue
		}

		// Resolve game
		game, ok := gameCache[gameSlug]
		if !ok {
			game, err = h.gameRepo.FindBySlug(c.Context(), gameSlug)
			if err != nil || game == nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: game slug '%s' tidak ditemukan di database", lineNum, gameSlug))
				result.Skipped++
				continue
			}
			gameCache[gameSlug] = game
		}

		// Find or create school
		schoolKey := strings.ToLower(sekolah) + "|" + tingkat
		school, ok := schoolCache[schoolKey]
		if !ok {
			school, err = h.schoolRepo.FindByNameAndLevel(c.Context(), sekolah, tingkat)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal mencari sekolah - %s", lineNum, err.Error()))
				result.Skipped++
				continue
			}
			if school == nil {
				school = &model.School{
					ID:        uuid.New(),
					Name:      sekolah,
					Level:     tingkat,
					City:      "Denpasar",
					CreatedAt: time.Now(),
				}
				if err := h.schoolRepo.Create(c.Context(), school); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal membuat sekolah - %s", lineNum, err.Error()))
					result.Skipped++
					continue
				}
			}
			schoolCache[schoolKey] = school
		}

		// Find or create user by NISN
		user, err := h.userRepo.FindByNISN(c.Context(), nisn)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal mencari user - %s", lineNum, err.Error()))
			result.Skipped++
			continue
		}

		if user == nil {
			// Generate a random 8-character password instead of using NISN
			plainPassword, err := generateRandomPassword()
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal generate password", lineNum))
				result.Skipped++
				continue
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal hash password", lineNum))
				result.Skipped++
				continue
			}
			generatedPasswords[nisn] = plainPassword

			email := fmt.Sprintf("%s@porjar.local", nisn)
			user = &model.User{
				ID:                  uuid.New(),
				Email:               email,
				PasswordHash:        string(hash),
				FullName:            nama,
				Role:                "player",
				NISN:                &nisn,
				Tingkat:             &tingkat,
				NomorPertandingan:   &nomorPertandingan,
				NeedsPasswordChange: true,
				CreatedAt:           time.Now(),
				UpdatedAt:           time.Now(),
			}

			if err := h.userRepo.Create(c.Context(), user); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: NISN '%s' duplicate atau gagal menyimpan user", lineNum, nisn))
				result.Skipped++
				continue
			}

			if !createdUsers[nisn] {
				createdUsers[nisn] = true
				result.ImportedUsers++
			}
		}

		// Find or create team
		teamKey := strings.ToLower(namaTim) + "|" + game.ID.String()
		team, ok := teamCache[teamKey]
		if !ok {
			team, err = h.teamRepo.FindByNameAndGame(c.Context(), namaTim, game.ID)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal mencari tim - %s", lineNum, err.Error()))
				result.Skipped++
				continue
			}
			if team == nil {
				now := time.Now()
				team = &model.Team{
					ID:        uuid.New(),
					Name:      namaTim,
					GameID:    game.ID,
					SchoolID:  &school.ID,
					Status:    "approved",
					CreatedAt: now,
					UpdatedAt: now,
				}

				// If this user is ketua, set as captain
				if csvRole == "ketua" {
					team.CaptainUserID = &user.ID
				}

				if err := h.teamRepo.Create(c.Context(), team); err != nil {
					result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal membuat tim '%s' - %s", lineNum, namaTim, err.Error()))
					result.Skipped++
					continue
				}

				if !createdTeams[teamKey] {
					createdTeams[teamKey] = true
					result.ImportedTeams++
				}
			}
			teamCache[teamKey] = team
		}

		// If this user is ketua and team doesn't have a captain yet, update captain
		if csvRole == "ketua" && team.CaptainUserID == nil {
			team.CaptainUserID = &user.ID
			team.UpdatedAt = time.Now()
			_ = h.teamRepo.Update(c.Context(), team)
		}

		// Add user to team as member
		memberRole := "member"
		if csvRole == "ketua" {
			memberRole = "captain"
		}

		// Check if already a member
		existingMember, _ := h.teamMemberRepo.FindByTeamAndUser(c.Context(), team.ID, user.ID)
		if existingMember == nil {
			member := &model.TeamMember{
				ID:         uuid.New(),
				TeamID:     team.ID,
				UserID:     &user.ID,
				InGameName: nama,
				Role:       memberRole,
				JoinedAt:   time.Now(),
			}
			if err := h.teamMemberRepo.Create(c.Context(), member); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal menambah member ke tim - %s", lineNum, err.Error()))
				result.Skipped++
				continue
			}
		}

		// Add to credentials list — password is only available for newly created users
		pwd := ""
		if p, ok := generatedPasswords[nisn]; ok {
			pwd = p
		}
		result.Credentials = append(result.Credentials, credentialEntry{
			Nama:     nama,
			NISN:     nisn,
			Password: pwd,
			Tim:      namaTim,
			Game:     nomorPertandingan,
		})
	}

	return response.OK(c, result)
}

// ImportSchools handles bulk CSV import of schools.
// POST /admin/import/schools
func (h *ImportHandler) ImportSchools(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "File CSV wajib diunggah")
	}

	f, err := file.Open()
	if err != nil {
		return response.BadRequest(c, "Gagal membaca file")
	}
	defer f.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, f); err != nil {
		return response.BadRequest(c, "Gagal membaca file")
	}

	reader := csv.NewReader(bytes.NewReader(buf.Bytes()))
	reader.TrimLeadingSpace = true

	// Read header
	header, err := reader.Read()
	if err != nil {
		return response.BadRequest(c, "File CSV kosong atau format tidak valid")
	}

	// Find column indices
	colIdx := map[string]int{}
	for i, col := range header {
		colIdx[strings.ToLower(strings.TrimSpace(col))] = i
	}

	nameIdx, hasName := colIdx["name"]
	levelIdx, hasLevel := colIdx["level"]
	if !hasName || !hasLevel {
		return response.BadRequest(c, "CSV harus memiliki kolom 'name' dan 'level'")
	}
	addressIdx, hasAddress := colIdx["address"]
	cityIdx, hasCity := colIdx["city"]

	result := importResult{}
	lineNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		lineNum++
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: format tidak valid", lineNum))
			result.Skipped++
			continue
		}

		name := strings.TrimSpace(record[nameIdx])
		level := strings.TrimSpace(record[levelIdx])

		if name == "" || level == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: name dan level wajib diisi", lineNum))
			result.Skipped++
			continue
		}

		// Validate level
		validLevels := map[string]bool{"SD": true, "SMP": true, "SMA": true, "SMK": true}
		level = strings.ToUpper(level)
		if !validLevels[level] {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: level harus SD/SMP/SMA/SMK", lineNum))
			result.Skipped++
			continue
		}

		school := &model.School{
			ID:        uuid.New(),
			Name:      name,
			Level:     level,
			CreatedAt: time.Now(),
		}

		if hasAddress && addressIdx < len(record) {
			addr := strings.TrimSpace(record[addressIdx])
			if addr != "" {
				school.Address = &addr
			}
		}

		if hasCity && cityIdx < len(record) {
			city := strings.TrimSpace(record[cityIdx])
			if city != "" {
				school.City = city
			}
		}

		if school.City == "" {
			school.City = "Denpasar" // default city
		}

		if err := h.schoolRepo.Create(c.Context(), school); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal menyimpan - %s", lineNum, err.Error()))
			result.Skipped++
			continue
		}

		result.Imported++
	}

	return response.OK(c, result)
}

// ImportTeams handles bulk CSV import of teams.
// POST /admin/import/teams
func (h *ImportHandler) ImportTeams(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return response.BadRequest(c, "File CSV wajib diunggah")
	}

	f, err := file.Open()
	if err != nil {
		return response.BadRequest(c, "Gagal membaca file")
	}
	defer f.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, f); err != nil {
		return response.BadRequest(c, "Gagal membaca file")
	}

	reader := csv.NewReader(bytes.NewReader(buf.Bytes()))
	reader.TrimLeadingSpace = true

	// Read header
	header, err := reader.Read()
	if err != nil {
		return response.BadRequest(c, "File CSV kosong atau format tidak valid")
	}

	colIdx := map[string]int{}
	for i, col := range header {
		colIdx[strings.ToLower(strings.TrimSpace(col))] = i
	}

	teamNameIdx, hasTeamName := colIdx["team_name"]
	gameSlugIdx, hasGameSlug := colIdx["game_slug"]
	if !hasTeamName || !hasGameSlug {
		return response.BadRequest(c, "CSV harus memiliki kolom 'team_name' dan 'game_slug'")
	}
	schoolNameIdx, hasSchoolName := colIdx["school_name"]
	captainEmailIdx, hasCaptainEmail := colIdx["captain_email"]

	// Cache game lookups
	gameCache := map[string]*model.Game{}

	result := importResult{}
	lineNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		lineNum++
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: format tidak valid", lineNum))
			result.Skipped++
			continue
		}

		teamName := strings.TrimSpace(record[teamNameIdx])
		gameSlug := strings.TrimSpace(record[gameSlugIdx])

		if teamName == "" || gameSlug == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: team_name dan game_slug wajib diisi", lineNum))
			result.Skipped++
			continue
		}

		// Resolve game
		game, ok := gameCache[gameSlug]
		if !ok {
			game, err = h.gameRepo.FindBySlug(c.Context(), gameSlug)
			if err != nil || game == nil {
				result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: game '%s' tidak ditemukan", lineNum, gameSlug))
				result.Skipped++
				continue
			}
			gameCache[gameSlug] = game
		}

		now := time.Now()
		team := &model.Team{
			ID:        uuid.New(),
			Name:      teamName,
			GameID:    game.ID,
			Status:    "pending",
			CreatedAt: now,
			UpdatedAt: now,
		}

		// Resolve school (optional)
		if hasSchoolName && schoolNameIdx < len(record) {
			schoolName := strings.TrimSpace(record[schoolNameIdx])
			if schoolName != "" {
				// Search for school by name (first match)
				schools, _, err := h.schoolRepo.List(c.Context(), model.SchoolFilter{
					Search: &schoolName,
					Page:   1,
					Limit:  1,
				})
				if err == nil && len(schools) > 0 {
					team.SchoolID = &schools[0].ID
				}
			}
		}

		// Resolve captain (optional)
		if hasCaptainEmail && captainEmailIdx < len(record) {
			captainEmail := strings.TrimSpace(record[captainEmailIdx])
			if captainEmail != "" {
				captain, err := h.userRepo.FindByEmail(c.Context(), captainEmail)
				if err == nil && captain != nil {
					team.CaptainUserID = &captain.ID
				}
			}
		}

		if err := h.teamRepo.Create(c.Context(), team); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Baris %d: gagal menyimpan - %s", lineNum, err.Error()))
			result.Skipped++
			continue
		}

		// Auto-add captain as member if resolved
		if team.CaptainUserID != nil {
			member := &model.TeamMember{
				ID:       uuid.New(),
				TeamID:   team.ID,
				UserID:   team.CaptainUserID,
				Role:     "captain",
				JoinedAt: now,
			}
			// Best-effort, don't fail the import if this fails
			_ = h.teamMemberRepo.Create(c.Context(), member)
		}

		result.Imported++
	}

	return response.OK(c, result)
}
