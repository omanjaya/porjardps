package handler

import (
	"bytes"
	"encoding/csv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// ExportCredentials exports all imported NISN-based users as CSV for printing.
// GET /admin/import/credentials?tingkat=SMA&game=ml
func (h *ImportHandler) ExportCredentials(c *fiber.Ctx) error {
	tingkat := c.Query("tingkat")
	gameSlugFilter := c.Query("game")

	filter := model.UserNISNFilter{}
	if tingkat != "" {
		filter.Tingkat = &tingkat
	}

	users, err := h.userRepo.ListByNISN(c.Context(), filter)
	if err != nil {
		return response.BadRequest(c, "Gagal mengambil data: "+err.Error())
	}

	// Build team membership map: userID -> [{teamName, gameSlug, gameName}]
	type teamInfo struct {
		TeamName string
		GameSlug string
		GameName string // nomor_pertandingan display
		Role     string
		School   string
	}

	// We need to look up teams for each user. Cache games.
	gameCache := map[uuid.UUID]*model.Game{}
	allGames, _ := h.gameRepo.List(c.Context())
	for _, g := range allGames {
		gameCache[g.ID] = g
	}

	// Prepare CSV output
	var csvBuf bytes.Buffer
	writer := csv.NewWriter(&csvBuf)

	// Header
	_ = writer.Write([]string{"nama", "nisn", "password_default", "sekolah", "tim", "game", "tingkat", "role"})

	for _, u := range users {
		if u.NISN == nil {
			continue
		}

		nisn := *u.NISN
		nomorPertandingan := ""
		if u.NomorPertandingan != nil {
			nomorPertandingan = *u.NomorPertandingan
		}
		userTingkat := ""
		if u.Tingkat != nil {
			userTingkat = *u.Tingkat
		}

		// Filter by game slug if provided
		if gameSlugFilter != "" {
			nomorLower := strings.ToLower(nomorPertandingan)
			slug, ok := nomorPertandinganToSlug[nomorLower]
			if !ok || slug != gameSlugFilter {
				continue
			}
		}

		// Find team membership for this user
		teamName := ""
		memberRole := ""
		schoolName := ""

		// Search across all games this user might be in
		for _, game := range allGames {
			team, err := h.teamRepo.FindByUserAndGame(c.Context(), u.ID, game.ID)
			if err != nil || team == nil {
				continue
			}
			teamName = team.Name

			// Get member role
			member, err := h.teamMemberRepo.FindByTeamAndUser(c.Context(), team.ID, u.ID)
			if err == nil && member != nil {
				if member.Role == "captain" {
					memberRole = "ketua"
				} else {
					memberRole = "anggota"
				}
			}

			// Get school name
			if team.SchoolID != nil {
				school, err := h.schoolRepo.FindByID(c.Context(), *team.SchoolID)
				if err == nil && school != nil {
					schoolName = school.Name
				}
			}
			break
		}

		_ = writer.Write([]string{
			u.FullName,
			nisn,
			"***", // password hanya ditampilkan saat import
			schoolName,
			teamName,
			nomorPertandingan,
			userTingkat,
			memberRole,
		})
	}

	writer.Flush()

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=credentials.csv")
	return c.Send(csvBuf.Bytes())
}
