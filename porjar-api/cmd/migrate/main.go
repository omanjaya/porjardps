package main

import (
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

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

	m, err := migrate.New("file://migrations", dsn)
	if err != nil {
		log.Fatal("failed to create migrator:", err)
	}

	if len(os.Args) < 2 {
		fmt.Println("Usage: migrate [up|down|drop|version]")
		os.Exit(1)
	}

	switch os.Args[1] {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatal("migration up failed:", err)
		}
		fmt.Println("migrations applied successfully")

	case "down":
		if err := m.Steps(-1); err != nil {
			log.Fatal("migration down failed:", err)
		}
		fmt.Println("rolled back 1 migration")

	case "drop":
		if err := m.Drop(); err != nil {
			log.Fatal("drop failed:", err)
		}
		fmt.Println("all tables dropped")

	case "version":
		v, dirty, err := m.Version()
		if err != nil {
			log.Fatal("version check failed:", err)
		}
		fmt.Printf("version: %d, dirty: %v\n", v, dirty)

	default:
		fmt.Printf("unknown command: %s\n", os.Args[1])
		os.Exit(1)
	}
}
