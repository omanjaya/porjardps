package handler

import (
	"bytes"
	"encoding/csv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/credcrypto"
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

	// Build user -> teams map via team_members
	type userTeamInfo struct {
		TeamName string
		GameName string
		GameSlug string
		Role     string
		School   string
	}
	userTeamMap := map[uuid.UUID][]userTeamInfo{}

	// Fetch all team members for these users
	for _, u := range users {
		if u.NISN == nil {
			continue
		}
		memberships, err := h.teamMemberRepo.FindByUser(c.Context(), u.ID)
		if err != nil || len(memberships) == 0 {
			continue
		}
		for _, m := range memberships {
			team, err := h.teamRepo.FindByID(c.Context(), m.TeamID)
			if err != nil || team == nil {
				continue
			}
			game := gameCache[team.GameID]
			gameName := ""
			gameSlug := ""
			if game != nil {
				gameName = game.Name
				gameSlug = game.Slug
			}
			role := "anggota"
			if m.Role == "captain" {
				role = "ketua"
			}
			schoolName := ""
			if team.SchoolID != nil {
				school, _ := h.schoolRepo.FindByID(c.Context(), *team.SchoolID)
				if school != nil {
					schoolName = school.Name
				}
			}
			userTeamMap[u.ID] = append(userTeamMap[u.ID], userTeamInfo{
				TeamName: team.Name,
				GameName: gameName,
				GameSlug: gameSlug,
				Role:     role,
				School:   schoolName,
			})
		}
	}

	for _, u := range users {
		if u.NISN == nil {
			continue
		}

		nisn := *u.NISN
		userTingkat := ""
		if u.Tingkat != nil {
			userTingkat = *u.Tingkat
		}

		teams := userTeamMap[u.ID]
		if len(teams) == 0 {
			// User has no team — still export with empty fields
			if gameSlugFilter != "" {
				continue
			}
			storedPW := credcrypto.GetCredPassword(c.Context(), h.rdb, h.encKey, u.ID)
			_ = writer.Write([]string{
				u.FullName, nisn, storedPW, "", "", "", userTingkat, "",
			})
			continue
		}

		// Write one row per team membership
		storedPW := credcrypto.GetCredPassword(c.Context(), h.rdb, h.encKey, u.ID)
		for _, ti := range teams {
			if gameSlugFilter != "" && ti.GameSlug != gameSlugFilter {
				continue
			}
			_ = writer.Write([]string{
				u.FullName,
				nisn,
				storedPW,
				ti.School,
				ti.TeamName,
				ti.GameName,
				userTingkat,
				ti.Role,
			})
		}
	}

	writer.Flush()

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=credentials.csv")
	return c.Send(csvBuf.Bytes())
}
