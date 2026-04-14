package handler

import (
	"encoding/csv"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// ExportStandingsCSV exports tournament standings as a CSV file.
// GET /admin/tournaments/:id/standings/csv
func (h *ReportHandler) ExportStandingsCSV(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	report, err := h.reportService.GenerateTournamentReport(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate report"))
	}

	var buf strings.Builder
	buf.WriteString("\xEF\xBB\xBF") // UTF-8 BOM for Excel compatibility
	w := csv.NewWriter(&buf)

	// Header row
	w.Write([]string{
		"Rank", "Tim", "Match", "Menang", "Kalah", "Seri",
		"Total Poin", "Total Kill", "Poin Placement",
		"Best Placement", "Avg Placement", "Eliminasi",
	})

	for _, s := range report.Standings {
		rank := ""
		if s.RankPosition != nil {
			rank = fmt.Sprintf("%d", *s.RankPosition)
		}
		best := ""
		if s.BestPlacement != nil {
			best = fmt.Sprintf("%d", *s.BestPlacement)
		}
		avg := ""
		if s.AvgPlacement != nil {
			avg = fmt.Sprintf("%.1f", *s.AvgPlacement)
		}
		eliminated := "Tidak"
		if s.IsEliminated {
			eliminated = "Ya"
		}

		w.Write([]string{
			rank,
			s.TeamName,
			fmt.Sprintf("%d", s.MatchesPlayed),
			fmt.Sprintf("%d", s.Wins),
			fmt.Sprintf("%d", s.Losses),
			fmt.Sprintf("%d", s.Draws),
			fmt.Sprintf("%d", s.TotalPoints),
			fmt.Sprintf("%d", s.TotalKills),
			fmt.Sprintf("%d", s.TotalPlacementPoints),
			best,
			avg,
			eliminated,
		})
	}
	w.Flush()

	filename := fmt.Sprintf("Standings_%s.csv", report.Tournament.Name)
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.SendString(buf.String())
}
