package handler

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

func (h *GroupHandler) GetGroupStandings(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	standings, err := h.groupService.GetGroupStandings(c.Context(), groupID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, standings)
}

func (h *GroupHandler) SetPenaltyPoints(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	teamID, err := uuid.Parse(c.Params("teamId"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	var req struct {
		PenaltyPoints int `json:"penalty_points"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format data tidak valid")
	}

	if err := h.groupService.SetPenaltyPoints(c.Context(), groupID, teamID, req.PenaltyPoints); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Penalty points berhasil diperbarui"})
}

func (h *GroupHandler) SetMatchLive(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("matchId"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	if err := h.groupService.SetMatchLive(c.Context(), matchID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Match status diubah ke live"})
}

// ExportStandingsPDF generates a PDF with group standings for a tournament.
// GET /admin/tournaments/:id/groups/export-pdf
func (h *GroupHandler) ExportStandingsPDF(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	tournament, groups, allStandings, err := h.groupService.GetAllGroupStandings(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, err)
	}

	if len(groups) == 0 {
		return response.BadRequest(c, "Tidak ada grup ditemukan")
	}

	// Generate PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)

	pageW := 190.0

	// Register logos
	logoKota := getLogoPath("kota-denpasar.png")
	logoESI := getLogoPath("esi-denpasar.png")
	hasLogos := logoKota != "" && logoESI != ""
	if hasLogos {
		pdf.RegisterImageOptions(logoKota, gofpdf.ImageOptions{ImageType: "PNG"})
		pdf.RegisterImageOptions(logoESI, gofpdf.ImageOptions{ImageType: "PNG"})
	}

	drawKOP := func() {
		if hasLogos {
			logoSize := 14.0
			pdf.ImageOptions(logoKota, 10, pdf.GetY(), logoSize, logoSize, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
			pdf.ImageOptions(logoESI, 10+pageW-logoSize, pdf.GetY(), logoSize, logoSize, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
			pdf.SetFont("Helvetica", "B", 16)
			pdf.SetTextColor(180, 30, 30)
			centerW := pageW - 2*(logoSize+2)
			pdf.SetX(10 + logoSize + 2)
			pdf.CellFormat(centerW, 7, "PORJAR ESPORT 2026", "", 1, "C", false, 0, "")
			pdf.SetFont("Helvetica", "B", 11)
			pdf.SetTextColor(60, 60, 60)
			pdf.SetX(10 + logoSize + 2)
			pdf.CellFormat(centerW, 5, "Pekan Olahraga Pelajar Denpasar", "", 1, "C", false, 0, "")
		} else {
			pdf.SetFont("Helvetica", "B", 16)
			pdf.SetTextColor(180, 30, 30)
			pdf.CellFormat(pageW, 8, "PORJAR ESPORT 2026", "", 1, "C", false, 0, "")
			pdf.SetFont("Helvetica", "", 10)
			pdf.SetTextColor(60, 60, 60)
			pdf.CellFormat(pageW, 5, "Pekan Olahraga Pelajar Denpasar", "", 1, "C", false, 0, "")
		}
		pdf.Ln(2)

		// Subtitle
		pdf.SetFont("Helvetica", "B", 13)
		pdf.SetTextColor(40, 40, 40)
		pdf.CellFormat(pageW, 7, "Klasemen Fase Grup", "", 1, "C", false, 0, "")

		// Tournament name
		pdf.SetFont("Helvetica", "", 10)
		pdf.SetTextColor(100, 100, 100)
		pdf.CellFormat(pageW, 5, tournament.Name, "", 1, "C", false, 0, "")
		pdf.Ln(2)

		// Divider line
		pdf.SetDrawColor(180, 30, 30)
		pdf.SetLineWidth(0.5)
		pdf.Line(10, pdf.GetY(), 10+pageW, pdf.GetY())
		pdf.Ln(4)
	}

	pdf.AddPage()
	drawKOP()

	// Table column widths
	colW := []float64{8, 62, 12, 12, 12, 12, 14, 14, 14, 14, 16}
	headers := []string{"#", "Tim", "M", "W", "D", "L", "SM", "SK", "SS", "Pen", "Pts"}

	for _, group := range groups {
		standings := allStandings[group.ID]
		if len(standings) == 0 {
			continue
		}

		// Check if we need a new page (header + at least 2 rows)
		neededH := 8.0 + 7.0 + float64(len(standings))*6.0
		if pdf.GetY()+neededH > 270 {
			pdf.AddPage()
			drawKOP()
		}

		// Group name header
		pdf.SetFillColor(40, 60, 120)
		pdf.SetFont("Helvetica", "B", 10)
		pdf.SetTextColor(255, 255, 255)
		pdf.RoundedRect(10, pdf.GetY(), pageW, 7, 1.5, "1234", "F")
		pdf.SetXY(14, pdf.GetY()+1)
		pdf.CellFormat(pageW-8, 5, group.Name, "", 0, "L", false, 0, "")
		pdf.Ln(9)

		// Table header
		pdf.SetFillColor(245, 243, 240)
		pdf.SetFont("Helvetica", "B", 7)
		pdf.SetTextColor(100, 100, 100)
		x := 10.0
		for i, h := range headers {
			align := "C"
			if i == 1 {
				align = "L"
			}
			pdf.SetX(x)
			pdf.CellFormat(colW[i], 6, h, "", 0, align, true, 0, "")
			x += colW[i]
		}
		pdf.Ln(6)

		// Table rows
		for _, s := range standings {
			// Check page break for each row
			if pdf.GetY()+6 > 275 {
				pdf.AddPage()
				drawKOP()
			}

			advancing := s.RankPosition <= group.AdvanceCount && group.AdvanceCount > 0
			if advancing {
				pdf.SetFillColor(236, 253, 245) // light green
			} else {
				pdf.SetFillColor(255, 255, 255)
			}

			teamName := "-"
			if s.Team != nil {
				teamName = s.Team.Name
			}

			gdStr := fmt.Sprintf("%d", s.GoalDifference)
			if s.GoalDifference > 0 {
				gdStr = "+" + gdStr
			}

			rowData := []string{
				fmt.Sprintf("%d", s.RankPosition),
				teamName,
				fmt.Sprintf("%d", s.MatchesPlayed),
				fmt.Sprintf("%d", s.Wins),
				fmt.Sprintf("%d", s.Draws),
				fmt.Sprintf("%d", s.Losses),
				fmt.Sprintf("%d", s.GoalsFor),
				fmt.Sprintf("%d", s.GoalsAgainst),
				gdStr,
				fmt.Sprintf("%d", s.PenaltyPoints),
				fmt.Sprintf("%d", s.Points),
			}

			x = 10.0
			for i, val := range rowData {
				align := "C"
				fontStyle := ""
				if i == 1 {
					align = "L"
					fontStyle = ""
				}
				if i == len(rowData)-1 {
					fontStyle = "B" // bold for points
				}
				if i == 0 && advancing {
					pdf.SetFont("Helvetica", "B", 7)
					pdf.SetTextColor(22, 163, 74)
				} else {
					pdf.SetFont("Helvetica", fontStyle, 7)
					pdf.SetTextColor(60, 60, 60)
				}
				pdf.SetX(x)
				pdf.CellFormat(colW[i], 6, val, "", 0, align, true, 0, "")
				x += colW[i]
			}
			pdf.Ln(6)

			// Row separator
			pdf.SetDrawColor(230, 230, 230)
			pdf.SetLineWidth(0.1)
			pdf.Line(10, pdf.GetY(), 10+pageW, pdf.GetY())
		}

		pdf.Ln(4)
	}

	// Footer
	pdf.SetFont("Helvetica", "I", 7)
	pdf.SetTextColor(150, 150, 150)
	now := time.Now().Format("02 Jan 2006, 15:04 WITA")
	pdf.CellFormat(pageW, 5, fmt.Sprintf("Dicetak pada: %s", now), "", 0, "L", false, 0, "")

	pdfBytes, err := pdfToBytes(pdf)
	if err != nil {
		return response.BadRequest(c, "Gagal generate PDF")
	}

	safeName := strings.ReplaceAll(tournament.Name, " ", "_")
	filename := fmt.Sprintf("klasemen_grup_%s.pdf", safeName)

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.Send(pdfBytes)
}
