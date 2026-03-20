package validator

import (
	"net/mail"
	"regexp"
	"strings"
	"unicode"
)

var phoneRegex = regexp.MustCompile(`^(\+62|08)\d{8,13}$`)

// ValidateEmail checks email format
func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil && len(email) <= 255
}

// ValidatePhone checks Indonesian phone format
func ValidatePhone(phone string) bool {
	if phone == "" {
		return true // nullable
	}
	return phoneRegex.MatchString(phone)
}

// ValidatePassword checks password strength:
// min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
func ValidatePassword(password string) bool {
	if len(password) < 8 {
		return false
	}
	hasUpper := false
	hasLower := false
	hasNumber := false
	for _, ch := range password {
		if unicode.IsUpper(ch) {
			hasUpper = true
		}
		if unicode.IsLower(ch) {
			hasLower = true
		}
		if unicode.IsDigit(ch) {
			hasNumber = true
		}
	}
	return hasUpper && hasLower && hasNumber
}

// ValidateStringLength checks min/max length after trim
func ValidateStringLength(s string, min, max int) bool {
	trimmed := strings.TrimSpace(s)
	return len(trimmed) >= min && len(trimmed) <= max
}

// TrimString trims whitespace
func TrimString(s string) string {
	return strings.TrimSpace(s)
}
