package handler

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type ReportHandler struct {
	reportService *service.ReportService
}

func NewReportHandler(reportService *service.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

func (h *ReportHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/tournaments/:id/report", authMw, adminMw, h.GetReport)
	app.Get("/admin/tournaments/:id/report/download", authMw, adminMw, h.DownloadReport)
	app.Get("/admin/tournaments/:id/report/pdf", authMw, adminMw, h.DownloadReportPDF)
	app.Get("/admin/tournaments/:id/standings/csv", authMw, adminMw, h.ExportStandingsCSV)
}

// GetReport returns the tournament report as JSON
func (h *ReportHandler) GetReport(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	report, err := h.reportService.GenerateTournamentReport(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate report"))
	}

	return response.OK(c, report)
}

// DownloadReport returns the report as a downloadable JSON file.
// Future: integrate PDF generation here (e.g. wkhtmltopdf or chromedp).
func (h *ReportHandler) DownloadReport(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	report, err := h.reportService.GenerateTournamentReport(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate report"))
	}

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "marshal report"))
	}

	filename := fmt.Sprintf("laporan-%s.json", report.Tournament.Name)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Set("Content-Type", "application/json")
	return c.Send(data)
}

// DownloadReportPDF generates and returns the tournament report as a PDF file.
func (h *ReportHandler) DownloadReportPDF(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	report, err := h.reportService.GenerateTournamentReport(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate report"))
	}

	pdfBytes, err := generateReportPDF(report)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate PDF"))
	}

	safeName := strings.ReplaceAll(report.Tournament.Name, " ", "_")
	filename := fmt.Sprintf("Laporan_%s.pdf", safeName)

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Send(pdfBytes)
}

// ──────────────────────────────────────────────
// PDF Generation
// ──────────────────────────────────────────────

const (
	reportHeaderR = 180 // #B41E1E
	reportHeaderG = 30
	reportHeaderB = 30
)

// generateReportPDF builds the full tournament report PDF.
func generateReportPDF(report *service.TournamentReport) ([]byte, error) {
	pdf := gofpdf.New("L", "mm", "A4", "") // Landscape A4
	pdf.SetAutoPageBreak(true, 15)

	pageW, _ := pdf.GetPageSize()
	marginL := 10.0
	contentW := pageW - 2*marginL

	// Register logos
	logoKota := getLogoPath("kota-denpasar.png")
	logoESI := getLogoPath("esi-denpasar.png")
	hasLogos := false
	if logoKota != "" && logoESI != "" {
		pdf.RegisterImageOptions(logoKota, gofpdf.ImageOptions{ImageType: "PNG"})
		pdf.RegisterImageOptions(logoESI, gofpdf.ImageOptions{ImageType: "PNG"})
		hasLogos = true
	}

	// Page number footer
	pdf.SetFooterFunc(func() {
		pdf.SetY(-10)
		pdf.SetFont("Helvetica", "I", 7)
		pdf.SetTextColor(150, 150, 150)
		pdf.CellFormat(0, 10, fmt.Sprintf("Halaman %d", pdf.PageNo()), "", 0, "C", false, 0, "")
	})

	// ── Page 1: Header + Info + Statistics ──
	pdf.AddPage()
	reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)

	// Tournament info section
	pdf.Ln(6)
	reportSectionTitle(pdf, marginL, contentW, "INFORMASI TURNAMEN")
	pdf.Ln(2)

	info := report.Tournament
	infoRows := [][]string{
		{"Nama Turnamen", info.Name},
		{"Game", info.GameName},
		{"Format", strings.ToUpper(info.Format)},
		{"Best Of", fmt.Sprintf("%d", info.BestOf)},
		{"Status", strings.ToUpper(info.Status)},
	}
	if info.StartDate != nil {
		infoRows = append(infoRows, []string{"Tanggal Mulai", info.StartDate.Format("02 Jan 2006")})
	}
	if info.EndDate != nil {
		infoRows = append(infoRows, []string{"Tanggal Selesai", info.EndDate.Format("02 Jan 2006")})
	}

	labelW := 50.0
	valueW := contentW - labelW
	for _, row := range infoRows {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(60, 60, 60)
		pdf.SetX(marginL)
		pdf.CellFormat(labelW, 6, row[0], "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(40, 40, 40)
		pdf.CellFormat(valueW, 6, ": "+row[1], "", 1, "L", false, 0, "")
	}

	// Statistics section
	pdf.Ln(6)
	reportSectionTitle(pdf, marginL, contentW, "STATISTIK")
	pdf.Ln(2)

	stats := report.Statistics
	statRows := [][]string{
		{"Total Tim", fmt.Sprintf("%d", stats.TotalTeams)},
		{"Total Pertandingan", fmt.Sprintf("%d", stats.TotalMatches)},
		{"Pertandingan Selesai", fmt.Sprintf("%d", stats.CompletedMatches)},
	}
	if stats.TotalLobbies > 0 {
		statRows = append(statRows,
			[]string{"Total Lobi", fmt.Sprintf("%d", stats.TotalLobbies)},
			[]string{"Lobi Selesai", fmt.Sprintf("%d", stats.CompletedLobbies)},
		)
	}
	if stats.TotalGamesPlayed > 0 {
		statRows = append(statRows, []string{"Total Game Dimainkan", fmt.Sprintf("%d", stats.TotalGamesPlayed)})
	}

	for _, row := range statRows {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(60, 60, 60)
		pdf.SetX(marginL)
		pdf.CellFormat(labelW, 6, row[0], "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(40, 40, 40)
		pdf.CellFormat(valueW, 6, ": "+row[1], "", 1, "L", false, 0, "")
	}

	// ── Standings Table ──
	if len(report.Standings) > 0 {
		pdf.AddPage()
		reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)
		pdf.Ln(4)
		reportSectionTitle(pdf, marginL, contentW, "KLASEMEN")
		pdf.Ln(2)

		isBR := strings.ToLower(info.Format) == "battle_royale" || strings.ToLower(info.Format) == "br"

		// Define columns
		var headers []string
		var colWidths []float64
		if isBR {
			headers = []string{"#", "Tim", "Main", "Menang", "Kalah", "Kill", "Poin Placement", "Total Poin"}
			colWidths = []float64{12, contentW - 12 - 25 - 25 - 25 - 25 - 35 - 35, 25, 25, 25, 25, 35, 35}
		} else {
			headers = []string{"#", "Tim", "Main", "Menang", "Kalah", "Seri", "Total Poin"}
			colWidths = []float64{12, contentW - 12 - 25 - 25 - 25 - 25 - 30, 25, 25, 25, 25, 30}
		}

		reportTableHeader(pdf, marginL, headers, colWidths)

		for i, st := range report.Standings {
			if pdf.GetY()+6 > 190 { // near bottom of landscape page
				pdf.AddPage()
				reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)
				pdf.Ln(4)
				reportSectionTitle(pdf, marginL, contentW, "KLASEMEN (lanjutan)")
				pdf.Ln(2)
				reportTableHeader(pdf, marginL, headers, colWidths)
			}

			// Alternate row colors
			if i%2 == 0 {
				pdf.SetFillColor(248, 248, 248)
			} else {
				pdf.SetFillColor(255, 255, 255)
			}

			rank := "-"
			if st.RankPosition != nil {
				rank = fmt.Sprintf("%d", *st.RankPosition)
			}

			pdf.SetFont("Helvetica", "", 8)
			pdf.SetTextColor(40, 40, 40)
			pdf.SetX(marginL)

			var cells []string
			if isBR {
				cells = []string{
					rank,
					reportTruncStr(st.TeamName, 40),
					fmt.Sprintf("%d", st.MatchesPlayed),
					fmt.Sprintf("%d", st.Wins),
					fmt.Sprintf("%d", st.Losses),
					fmt.Sprintf("%d", st.TotalKills),
					fmt.Sprintf("%d", st.TotalPlacementPoints),
					fmt.Sprintf("%d", st.TotalPoints),
				}
			} else {
				cells = []string{
					rank,
					reportTruncStr(st.TeamName, 40),
					fmt.Sprintf("%d", st.MatchesPlayed),
					fmt.Sprintf("%d", st.Wins),
					fmt.Sprintf("%d", st.Losses),
					fmt.Sprintf("%d", st.Draws),
					fmt.Sprintf("%d", st.TotalPoints),
				}
			}

			for j, cell := range cells {
				align := "C"
				if j == 1 {
					align = "L"
				}
				pdf.CellFormat(colWidths[j], 6, cell, "1", 0, align, true, 0, "")
			}
			pdf.Ln(-1)
		}
	}

	// ── Match Results (bracket format) ──
	if len(report.Matches) > 0 {
		pdf.AddPage()
		reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)
		pdf.Ln(4)
		reportSectionTitle(pdf, marginL, contentW, "HASIL PERTANDINGAN (BRACKET)")
		pdf.Ln(2)

		matchHeaders := []string{"Ronde", "Match #", "Tim A", "Skor", "Tim B", "Pemenang", "Status"}
		matchWidths := []float64{20, 20, 55, 30, 55, 55, 30}
		// Adjust last column to fill
		totalUsed := 0.0
		for _, w := range matchWidths[:len(matchWidths)-1] {
			totalUsed += w
		}
		matchWidths[len(matchWidths)-1] = contentW - totalUsed

		reportTableHeader(pdf, marginL, matchHeaders, matchWidths)

		for i, m := range report.Matches {
			if pdf.GetY()+6 > 190 {
				pdf.AddPage()
				reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)
				pdf.Ln(4)
				reportSectionTitle(pdf, marginL, contentW, "HASIL PERTANDINGAN (lanjutan)")
				pdf.Ln(2)
				reportTableHeader(pdf, marginL, matchHeaders, matchWidths)
			}

			if i%2 == 0 {
				pdf.SetFillColor(248, 248, 248)
			} else {
				pdf.SetFillColor(255, 255, 255)
			}

			teamA := reportPtrStr(m.TeamAName, "BYE")
			teamB := reportPtrStr(m.TeamBName, "BYE")
			winner := reportPtrStr(m.WinnerName, "-")
			score := "-"
			if m.ScoreA != nil && m.ScoreB != nil {
				score = fmt.Sprintf("%d - %d", *m.ScoreA, *m.ScoreB)
			}

			cells := []string{
				fmt.Sprintf("%d", m.Round),
				fmt.Sprintf("%d", m.MatchNumber),
				reportTruncStr(teamA, 30),
				score,
				reportTruncStr(teamB, 30),
				reportTruncStr(winner, 30),
				strings.ToUpper(m.Status),
			}

			pdf.SetFont("Helvetica", "", 8)
			pdf.SetTextColor(40, 40, 40)
			pdf.SetX(marginL)

			for j, cell := range cells {
				align := "C"
				if j == 2 || j == 4 || j == 5 {
					align = "L"
				}
				pdf.CellFormat(matchWidths[j], 6, cell, "1", 0, align, true, 0, "")
			}
			pdf.Ln(-1)
		}
	}

	// ── Lobby Results (BR format) ──
	if len(report.Lobbies) > 0 {
		for _, lobby := range report.Lobbies {
			if len(lobby.Results) == 0 {
				continue
			}

			pdf.AddPage()
			reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)
			pdf.Ln(4)
			title := fmt.Sprintf("HASIL LOBI: %s (Hari %d)", lobby.LobbyName, lobby.DayNumber)
			reportSectionTitle(pdf, marginL, contentW, title)
			pdf.Ln(2)

			lobbyHeaders := []string{"#", "Tim", "Placement", "Kills", "Poin Placement", "Poin Kill", "Total Poin"}
			lobbyWidths := []float64{12, contentW - 12 - 30 - 25 - 35 - 30 - 35, 30, 25, 35, 30, 35}

			reportTableHeader(pdf, marginL, lobbyHeaders, lobbyWidths)

			for i, r := range lobby.Results {
				if pdf.GetY()+6 > 190 {
					pdf.AddPage()
					reportDrawHeader(pdf, report, marginL, contentW, hasLogos, logoKota, logoESI)
					pdf.Ln(4)
					reportSectionTitle(pdf, marginL, contentW, fmt.Sprintf("HASIL LOBI: %s (lanjutan)", lobby.LobbyName))
					pdf.Ln(2)
					reportTableHeader(pdf, marginL, lobbyHeaders, lobbyWidths)
				}

				if i%2 == 0 {
					pdf.SetFillColor(248, 248, 248)
				} else {
					pdf.SetFillColor(255, 255, 255)
				}

				cells := []string{
					fmt.Sprintf("%d", i+1),
					reportTruncStr(r.TeamName, 40),
					fmt.Sprintf("%d", r.Placement),
					fmt.Sprintf("%d", r.Kills),
					fmt.Sprintf("%d", r.PlacementPoints),
					fmt.Sprintf("%d", r.KillPoints),
					fmt.Sprintf("%d", r.TotalPoints),
				}

				pdf.SetFont("Helvetica", "", 8)
				pdf.SetTextColor(40, 40, 40)
				pdf.SetX(marginL)

				for j, cell := range cells {
					align := "C"
					if j == 1 {
						align = "L"
					}
					pdf.CellFormat(lobbyWidths[j], 6, cell, "1", 0, align, true, 0, "")
				}
				pdf.Ln(-1)
			}
		}
	}

	return pdfToBytes(pdf)
}

// reportDrawHeader draws the red header bar with logos and title.
func reportDrawHeader(pdf *gofpdf.Fpdf, report *service.TournamentReport, marginL, contentW float64, hasLogos bool, logoKota, logoESI string) {
	startY := pdf.GetY()

	// Red header bar
	pdf.SetFillColor(reportHeaderR, reportHeaderG, reportHeaderB)
	pdf.Rect(marginL, startY, contentW, 18, "F")

	if hasLogos {
		logoSize := 14.0
		pdf.ImageOptions(logoKota, marginL+3, startY+2, logoSize, logoSize, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
		pdf.ImageOptions(logoESI, marginL+contentW-logoSize-3, startY+2, logoSize, logoSize, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
	}

	// Title line 1
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(marginL, startY+2)
	pdf.CellFormat(contentW, 7, "LAPORAN TURNAMEN - PORJAR ESPORT 2026", "", 1, "C", false, 0, "")

	// Title line 2: tournament name
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetXY(marginL, startY+9)
	subtitle := report.Tournament.Name
	if report.Tournament.GameName != "" {
		subtitle += " | " + report.Tournament.GameName
	}
	pdf.CellFormat(contentW, 6, subtitle, "", 1, "C", false, 0, "")

	pdf.SetY(startY + 20)
}

// reportSectionTitle draws a section title with a subtle left accent.
func reportSectionTitle(pdf *gofpdf.Fpdf, marginL, contentW float64, title string) {
	y := pdf.GetY()
	// Accent bar
	pdf.SetFillColor(reportHeaderR, reportHeaderG, reportHeaderB)
	pdf.Rect(marginL, y, 3, 7, "F")
	// Title text
	pdf.SetFont("Helvetica", "B", 11)
	pdf.SetTextColor(reportHeaderR, reportHeaderG, reportHeaderB)
	pdf.SetXY(marginL+5, y)
	pdf.CellFormat(contentW-5, 7, title, "", 1, "L", false, 0, "")
	// Underline
	pdf.SetDrawColor(220, 220, 220)
	pdf.SetLineWidth(0.3)
	pdf.Line(marginL, y+8, marginL+contentW, y+8)
	pdf.SetY(y + 9)
}

// reportTableHeader draws the table header row with dark background.
func reportTableHeader(pdf *gofpdf.Fpdf, marginL float64, headers []string, widths []float64) {
	pdf.SetFillColor(50, 50, 60)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.SetX(marginL)
	for i, h := range headers {
		align := "C"
		if i == 1 {
			align = "L"
		}
		pdf.CellFormat(widths[i], 7, h, "1", 0, align, true, 0, "")
	}
	pdf.Ln(-1)
}

// reportTruncStr truncates a string to maxLen characters with ellipsis.
func reportTruncStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// reportPtrStr dereferences a *string or returns the fallback.
func reportPtrStr(p *string, fallback string) string {
	if p == nil {
		return fallback
	}
	return *p
}
