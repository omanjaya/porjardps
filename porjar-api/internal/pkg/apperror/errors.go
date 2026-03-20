package apperror

import (
	"fmt"
	"strings"
)

type AppError struct {
	Code       string            `json:"code"`
	Message    string            `json:"message"`
	HTTPStatus int               `json:"-"`
	Details    map[string]string `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	return e.Message
}

// Predefined base errors
var (
	ErrNotFound     = &AppError{Code: "NOT_FOUND", HTTPStatus: 404}
	ErrUnauthorized = &AppError{Code: "UNAUTHORIZED", Message: "Anda belum login", HTTPStatus: 401}
	ErrForbidden    = &AppError{Code: "FORBIDDEN", Message: "Anda tidak memiliki akses ke halaman ini", HTTPStatus: 403}
	ErrConflict     = &AppError{Code: "CONFLICT", HTTPStatus: 409}
	ErrValidation   = &AppError{Code: "VALIDATION_ERROR", Message: "Data yang dikirim tidak valid", HTTPStatus: 400}
	ErrBusinessRule = &AppError{Code: "BUSINESS_RULE_VIOLATION", HTTPStatus: 422}
	ErrInternal     = &AppError{Code: "INTERNAL_ERROR", Message: "Terjadi kesalahan pada server, coba lagi nanti", HTTPStatus: 500}
)

// New creates a new AppError with specific code and message
func New(code, message string, httpStatus int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: httpStatus,
	}
}

// NotFound creates a 404 error for a specific resource
func NotFound(resource string) *AppError {
	return &AppError{
		Code:       strings.ToUpper(resource) + "_NOT_FOUND",
		Message:    resource + " tidak ditemukan",
		HTTPStatus: 404,
	}
}

// Conflict creates a 409 error
func Conflict(code, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: 409,
	}
}

// BusinessRule creates a 422 error
func BusinessRule(code, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		HTTPStatus: 422,
	}
}

// ValidationError creates a 400 error with field details
func ValidationError(details map[string]string) *AppError {
	return &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    "Data yang dikirim tidak valid",
		HTTPStatus: 400,
		Details:    details,
	}
}

// Wrap wraps an existing error with context
func Wrap(err error, context string) error {
	return fmt.Errorf("%s: %w", context, err)
}

// Auth-specific errors
var (
	ErrTokenExpired        = New("TOKEN_EXPIRED", "Sesi telah berakhir, silakan login kembali", 401)
	ErrTokenInvalid        = New("TOKEN_INVALID", "Token tidak valid", 401)
	ErrRefreshTokenInvalid = New("REFRESH_TOKEN_INVALID", "Refresh token tidak valid atau sudah digunakan", 401)
	ErrRefreshTokenExpired = New("REFRESH_TOKEN_EXPIRED", "Sesi habis, silakan login kembali", 401)
	ErrInvalidCredentials  = New("INVALID_CREDENTIALS", "Email atau password salah", 401)
	ErrAccountLocked       = New("ACCOUNT_LOCKED", "Akun dikunci sementara karena terlalu banyak percobaan login", 401)
	ErrForbiddenResource   = New("FORBIDDEN_RESOURCE", "Anda tidak memiliki akses ke data ini", 403)
)
