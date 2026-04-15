package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type CalendarHandler struct {
	eventRepo      model.EventRepository
	tournamentRepo model.TournamentRepository
}

func NewCalendarHandler(eventRepo model.EventRepository, tournamentRepo model.TournamentRepository) *CalendarHandler {
	return &CalendarHandler{eventRepo: eventRepo, tournamentRepo: tournamentRepo}
}

func (h *CalendarHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/calendar", authMw, adminMw, h.GetCalendar)
}

type calendarTournamentItem struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	GameName string    `json:"game_name"`
	Status   string    `json:"status"`
}

type calendarEventItem struct {
	ID                uuid.UUID                `json:"id"`
	Name              string                   `json:"name"`
	Slug              string                   `json:"slug"`
	Status            string                   `json:"status"`
	Organizer         *string                  `json:"organizer"`
	StartDate         *time.Time               `json:"start_date"`
	EndDate           *time.Time               `json:"end_date"`
	RegistrationStart *time.Time               `json:"registration_start"`
	RegistrationEnd   *time.Time               `json:"registration_end"`
	PrimaryColor      string                   `json:"primary_color"`
	LogoURL           *string                  `json:"logo_url"`
	Tournaments       []calendarTournamentItem `json:"tournaments"`
}

type calendarResponse struct {
	Year   int                 `json:"year"`
	Month  int                 `json:"month"`
	Events []calendarEventItem `json:"events"`
}

// GetCalendar returns events (with their tournaments) overlapping the given month.
func (h *CalendarHandler) GetCalendar(c *fiber.Ctx) error {
	year := c.QueryInt("year", 0)
	month := c.QueryInt("month", 0)

	if year < 2000 || year > 2100 {
		return response.BadRequest(c, "Parameter year tidak valid (2000–2100)")
	}
	if month < 1 || month > 12 {
		return response.BadRequest(c, "Parameter month tidak valid (1–12)")
	}

	// Compute first and last day of the requested month (UTC).
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0).Add(-time.Nanosecond) // last instant of last day

	events, err := h.eventRepo.ListByDateRange(c.Context(), start, end)
	if err != nil {
		return response.HandleError(c, err)
	}

	items := make([]calendarEventItem, 0, len(events))
	for _, e := range events {
		tournaments, _, err := h.tournamentRepo.List(c.Context(), model.TournamentFilter{
			EventID: &e.ID,
			Page:    1,
			Limit:   100,
		})
		if err != nil {
			return response.HandleError(c, err)
		}

		tItems := make([]calendarTournamentItem, 0, len(tournaments))
		for _, t := range tournaments {
			gameName := ""
			if t.Game != nil {
				gameName = t.Game.Name
			}
			tItems = append(tItems, calendarTournamentItem{
				ID:       t.ID,
				Name:     t.Name,
				GameName: gameName,
				Status:   t.Status,
			})
		}

		items = append(items, calendarEventItem{
			ID:                e.ID,
			Name:              e.Name,
			Slug:              e.Slug,
			Status:            e.Status,
			Organizer:         e.Organizer,
			StartDate:         e.StartDate,
			EndDate:           e.EndDate,
			RegistrationStart: e.RegistrationStart,
			RegistrationEnd:   e.RegistrationEnd,
			PrimaryColor:      e.PrimaryColor,
			LogoURL:           e.LogoURL,
			Tournaments:       tItems,
		})
	}

	return response.OK(c, calendarResponse{
		Year:   year,
		Month:  month,
		Events: items,
	})
}
