package response

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type ErrorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

type Meta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// OK returns a 200 response with data
func OK(c *fiber.Ctx, data interface{}) error {
	return c.Status(200).JSON(Response{
		Success: true,
		Data:    data,
	})
}

// Created returns a 201 response with data
func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(201).JSON(Response{
		Success: true,
		Data:    data,
	})
}

// NoContent returns 204
func NoContent(c *fiber.Ctx) error {
	return c.SendStatus(204)
}

// Paginated returns a 200 response with data and pagination meta
func Paginated(c *fiber.Ctx, data interface{}, meta Meta) error {
	return c.Status(200).JSON(Response{
		Success: true,
		Data:    data,
		Meta:    &meta,
	})
}

// Err returns an error response based on AppError
func Err(c *fiber.Ctx, appErr *apperror.AppError) error {
	return c.Status(appErr.HTTPStatus).JSON(Response{
		Success: false,
		Error: &ErrorBody{
			Code:    appErr.Code,
			Message: appErr.Message,
			Details: appErr.Details,
		},
	})
}

// HandleError maps any error to the appropriate HTTP response
func HandleError(c *fiber.Ctx, err error) error {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		return Err(c, appErr)
	}

	// Unknown error — return 500
	return Err(c, apperror.ErrInternal)
}

// BadRequest returns 400 with a message
func BadRequest(c *fiber.Ctx, message string) error {
	return c.Status(400).JSON(Response{
		Success: false,
		Error: &ErrorBody{
			Code:    "BAD_REQUEST",
			Message: message,
		},
	})
}

// NotFound returns 404
func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(404).JSON(Response{
		Success: false,
		Error: &ErrorBody{
			Code:    "NOT_FOUND",
			Message: message,
		},
	})
}

// Forbidden returns 403
func Forbidden(c *fiber.Ctx, code string) error {
	return c.Status(403).JSON(Response{
		Success: false,
		Error: &ErrorBody{
			Code:    code,
			Message: "Anda tidak memiliki akses",
		},
	})
}
