package handler

import (
	"bytes"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

func (h *BRHandler) GetStandings(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	standings, svcErr := h.standingsService.GetByTournamentWithTeams(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, standings)
}

func (h *BRHandler) GetPointRules(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	rules, svcErr := h.brService.GetPointRules(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, rules)
}

// UpdatePointRules updates point rules + kill_point_value + wwcd_bonus for a tournament
type updatePointRulesRequest struct {
	KillPointValue         *float64 `json:"kill_point_value"`
	WWCDBonus              *int     `json:"wwcd_bonus"`
	QualificationThreshold *int     `json:"qualification_threshold"`
	MaxLobbyTeams          *int     `json:"max_lobby_teams"`
	Rules                  []struct {
		Placement int `json:"placement"`
		Points    int `json:"points"`
	} `json:"rules"`
}

func (h *BRHandler) UpdatePointRules(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req updatePointRulesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Note: The actual tournament update should be done via tournament service
	// This endpoint focuses on point rules. Tournament fields (kill_point_value, wwcd_bonus, etc.)
	// are stored on the tournament and should be updated via PUT /admin/tournaments/:id
	// For now, we just update the point rules if provided.

	if len(req.Rules) > 0 {
		// Delete existing rules and recreate
		_, svcErr := h.brService.GetPointRules(c.Context(), tournamentID)
		if svcErr != nil {
			return response.HandleError(c, svcErr)
		}

		// Use service to recreate rules
		if svcErr := h.brService.UpdatePointRules(c.Context(), tournamentID, req.Rules, req.KillPointValue, req.WWCDBonus, req.QualificationThreshold, req.MaxLobbyTeams); svcErr != nil {
			return response.HandleError(c, svcErr)
		}
	}

	return response.OK(c, fiber.Map{"message": "Point rules berhasil diperbarui"})
}

func (h *BRHandler) GetQualification(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	data, svcErr := h.brService.GetQualification(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, data)
}

// ExportStandingsPDF generates and returns a PDF of BR standings for a tournament.
func (h *BRHandler) ExportStandingsPDF(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	standings, svcErr := h.standingsService.GetByTournamentWithTeams(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	// Fetch tournament name if repo available
	tournamentName := "Tournament"
	if h.tournamentRepo != nil {
		if t, err := h.tournamentRepo.FindByID(c.Context(), tournamentID); err == nil && t != nil {
			tournamentName = t.Name
		}
	}

	pdfBytes, err := generateStandingsPDF(tournamentName, standings)
	if err != nil {
		return response.Err(c, apperror.ErrInternal)
	}

	filename := fmt.Sprintf("standings-%s.pdf", time.Now().Format("20060102"))
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Send(pdfBytes)
}

// generateStandingsPDF creates a PDF document for BR standings.
func generateStandingsPDF(tournamentName string, standings []*model.StandingWithTeam) ([]byte, error) {
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10)
	pdf.AddPage()

	// Title
	pdf.SetFont("Helvetica", "B", 16)
	pdf.SetTextColor(30, 30, 30)
	pdf.CellFormat(0, 10, "Standings - "+tournamentName, "", 1, "C", false, 0, "")

	// Subtitle: generated date
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(0, 6, "Digenerate: "+time.Now().In(func() *time.Location {
		loc, _ := time.LoadLocation("Asia/Makassar")
		if loc == nil {
			return time.UTC
		}
		return loc
	}()).Format("02 Jan 2006 15:04 WITA"), "", 1, "C", false, 0, "")
	pdf.Ln(4)

	// Table header
	colWidths := []float64{12, 60, 20, 16, 16, 16, 16, 18, 18, 18}
	headers := []string{"#", "Tim", "Sekolah", "Lobby", "Poin", "Kill", "PP", "Best", "Avg", "Status"}
	aligns := []string{"C", "L", "L", "C", "C", "C", "C", "C", "C", "C"}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetFillColor(220, 38, 38) // porjar red
	pdf.SetTextColor(255, 255, 255)
	for i, h := range headers {
		pdf.CellFormat(colWidths[i], 7, h, "1", 0, aligns[i], true, 0, "")
	}
	pdf.Ln(-1)

	// Table rows
	pdf.SetFont("Helvetica", "", 8)
	for idx, s := range standings {
		// Alternating row background
		if idx%2 == 0 {
			pdf.SetFillColor(248, 248, 248)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		rankStr := "-"
		if s.RankPosition != nil {
			rankStr = fmt.Sprintf("%d", *s.RankPosition)
		}

		statusStr := "Aktif"
		if s.IsEliminated {
			statusStr = "Elim"
		}

		bestStr := "-"
		if s.BestPlacement != nil {
			bestStr = fmt.Sprintf("%d", *s.BestPlacement)
		}

		avgStr := "-"
		if s.AvgPlacement != nil {
			avgStr = fmt.Sprintf("%.1f", *s.AvgPlacement)
		}

		schoolName := ""
		if s.Team.SchoolName != nil {
			schoolName = *s.Team.SchoolName
		}

		// Text color: eliminated rows in grey
		if s.IsEliminated {
			pdf.SetTextColor(150, 150, 150)
		} else {
			pdf.SetTextColor(30, 30, 30)
		}

		row := []string{
			rankStr,
			s.Team.Name,
			schoolName,
			fmt.Sprintf("%d", s.MatchesPlayed),
			fmt.Sprintf("%d", s.TotalPoints),
			fmt.Sprintf("%d", s.TotalKills),
			fmt.Sprintf("%d", s.TotalPlacementPoints),
			bestStr,
			avgStr,
			statusStr,
		}
		for i, cell := range row {
			pdf.CellFormat(colWidths[i], 6, cell, "1", 0, aligns[i], true, 0, "")
		}
		pdf.Ln(-1)
	}

	// Footer note
	pdf.Ln(4)
	pdf.SetFont("Helvetica", "I", 7)
	pdf.SetTextColor(120, 120, 120)
	pdf.CellFormat(0, 5, "PP = Placement Points | Poin = Total Poin (termasuk kill & WWCD) | Lobby = jumlah lobby dimainkan", "", 1, "L", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("generate standings PDF: %w", err)
	}
	return buf.Bytes(), nil
}
