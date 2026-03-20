package handler

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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
