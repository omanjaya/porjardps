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
// min 8 chars, at least 1 lowercase, 1 uppercase, 1 number
func ValidatePassword(password string) bool {
	if len(password) < 8 {
		return false
	}
	hasLower := false
	hasUpper := false
	hasNumber := false
	for _, ch := range password {
		if unicode.IsLower(ch) {
			hasLower = true
		}
		if unicode.IsUpper(ch) {
			hasUpper = true
		}
		if unicode.IsDigit(ch) {
			hasNumber = true
		}
	}
	return hasLower && hasUpper && hasNumber
}

// PasswordStrength returns 0-4 based on requirements met.
// 0-1 = weak, 2 = fair, 3 = strong, 4 = very strong
func PasswordStrength(pw string) int {
	if len(pw) < 8 {
		return 0
	}
	score := 0
	hasLower := false
	hasUpper := false
	hasDigit := false
	hasSpecial := false
	for _, c := range pw {
		switch {
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= '0' && c <= '9':
			hasDigit = true
		case c > 32 && c < 127:
			hasSpecial = true
		}
	}
	if hasLower {
		score++
	}
	if hasDigit {
		score++
	}
	if hasUpper {
		score++
	}
	if hasSpecial {
		score++
	}
	return score
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
