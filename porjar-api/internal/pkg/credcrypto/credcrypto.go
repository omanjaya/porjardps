// Package credcrypto provides AES-256-GCM encryption helpers for storing
// credential passwords in Redis so they can be re-displayed on credential
// cards. The encryption key is derived from the JWT secret.
package credcrypto

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const credPWKeyPrefix = "cred_pw:"
const credPWTTL = 90 * 24 * time.Hour

// DeriveEncKey pads/truncates a string to exactly 32 bytes for AES-256.
func DeriveEncKey(secret string) []byte {
	key := make([]byte, 32)
	copy(key, []byte(secret))
	return key
}

// EncryptPassword encrypts a plaintext password using AES-256-GCM and returns a base64 string.
func EncryptPassword(plain string, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plain), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptPassword decrypts a base64-encoded AES-256-GCM ciphertext back to plaintext.
func DecryptPassword(encrypted string, key []byte) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// StoreCredPassword encrypts then saves the password in Redis for credential card display.
func StoreCredPassword(ctx context.Context, rdb *redis.Client, key []byte, userID uuid.UUID, plain string) {
	enc, err := EncryptPassword(plain, key)
	if err != nil {
		return
	}
	_ = rdb.Set(ctx, credPWKeyPrefix+userID.String(), enc, credPWTTL).Err()
}

// GetCredPassword retrieves and decrypts the stored password from Redis, returns "" if not found.
func GetCredPassword(ctx context.Context, rdb *redis.Client, key []byte, userID uuid.UUID) string {
	val, err := rdb.Get(ctx, credPWKeyPrefix+userID.String()).Result()
	if err != nil {
		return ""
	}
	plain, err := DecryptPassword(val, key)
	if err != nil {
		return ""
	}
	return plain
}
