//go:build ignore

package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/porjar-denpasar/porjar-api/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("failed to load config:", err)
	}

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
	)

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}
	defer db.Close()

	users := []struct {
		email, password, name, role string
	}{
		{"superadmin@porjardenpasar.com", "SuperAdmin@Porjar2026!", "Super Admin Porjar", "superadmin"},
		{"admin@porjardenpasar.com", "Admin@Porjar2026!", "Admin Porjar", "admin"},
	}

	for _, u := range users {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("  warn: hash for %s: %v", u.email, err)
			continue
		}

		_, err = db.Exec(ctx,
			`INSERT INTO users (email, password_hash, full_name, role)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (email) DO NOTHING`,
			u.email, string(hash), u.name, u.role,
		)
		if err != nil {
			log.Printf("  warn: user %s: %v", u.email, err)
		} else {
			fmt.Printf("  ✓ created: %s (%s)\n", u.email, u.role)
		}
	}

	fmt.Println("done!")
}
