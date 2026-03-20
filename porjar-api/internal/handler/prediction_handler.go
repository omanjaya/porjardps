package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type PredictionHandler struct {
	predictionService *service.PredictionService
}

func NewPredictionHandler(predictionService *service.PredictionService) *PredictionHandler {
	return &PredictionHandler{predictionService: predictionService}
}

func (h *PredictionHandler) RegisterRoutes(app fiber.Router, authMw fiber.Handler, optionalAuthMw fiber.Handler) {
	// Auth-required routes
	app.Post("/matches/:id/predict", authMw, h.Predict)

	// Public routes (with optional auth for user-specific data)
	app.Get("/matches/:id/predictions", optionalAuthMw, h.GetMatchPredictions)

	// Public routes
	app.Get("/players/:id/predictions", h.GetUserPredictionAccuracy)
}

type predictRequest struct {
	PredictedWinnerID string `json:"predicted_winner_id"`
}

func (h *PredictionHandler) Predict(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	userID := middleware.GetUserID(c)
	if userID == uuid.Nil {
		return response.Err(c, apperror.ErrUnauthorized)
	}

	var req predictRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	teamID, err := uuid.Parse(req.PredictedWinnerID)
	if err != nil {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"predicted_winner_id": "Team ID tidak valid",
		}))
	}

	if svcErr := h.predictionService.Predict(c.Context(), matchID, userID, teamID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Prediksi berhasil disimpan"})
}

func (h *PredictionHandler) GetMatchPredictions(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	// Get user ID if authenticated (optional)
	var userIDPtr *uuid.UUID
	userID, ok := c.Locals(middleware.LocalUserID).(uuid.UUID)
	if ok && userID != uuid.Nil {
		userIDPtr = &userID
	}

	teamAVotes, teamBVotes, userPrediction, svcErr := h.predictionService.GetMatchPredictions(c.Context(), matchID, userIDPtr)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	total := teamAVotes + teamBVotes
	var teamAPct, teamBPct float64
	if total > 0 {
		teamAPct = float64(teamAVotes) / float64(total) * 100
		teamBPct = float64(teamBVotes) / float64(total) * 100
	}

	result := fiber.Map{
		"team_a_votes":    teamAVotes,
		"team_b_votes":    teamBVotes,
		"total_votes":     total,
		"team_a_percent":  teamAPct,
		"team_b_percent":  teamBPct,
		"user_prediction": userPrediction,
	}

	return response.OK(c, result)
}

func (h *PredictionHandler) GetUserPredictionAccuracy(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "User ID tidak valid")
	}

	correct, total, accuracy, svcErr := h.predictionService.GetUserPredictionAccuracy(c.Context(), userID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"correct":  correct,
		"total":    total,
		"accuracy": accuracy,
	})
}
