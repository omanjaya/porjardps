.PHONY: up down dev-infra dev-api dev-web dev migrate-up migrate-down seed test-api test-web build-api build-web logs ps

# ─────────────────────────────────────────
# Docker (Full Stack)
# ─────────────────────────────────────────

# Start semua service (hot reload)
up:
	docker compose up --build -d

# Stop semua
down:
	docker compose down

# Rebuild & restart
restart:
	docker compose down && docker compose up --build -d

# View logs
logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-web:
	docker compose logs -f web

# Status
ps:
	docker compose ps

# ─────────────────────────────────────────
# Docker (Infrastructure Only)
# ─────────────────────────────────────────

# Start hanya DB + Redis (untuk local dev tanpa Docker)
dev-infra:
	docker compose up postgres redis -d

# ─────────────────────────────────────────
# Local Dev (tanpa Docker untuk API/Web)
# ─────────────────────────────────────────

# Start API dengan hot reload (perlu dev-infra dulu)
dev-api:
	cd porjar-api && air

# Start Web dengan hot reload
dev-web:
	cd porjar-web && npm run dev -- -p 4200

# Start keduanya (di terminal terpisah)
dev: dev-infra
	@echo "Infrastructure started. Run in separate terminals:"
	@echo "  make dev-api"
	@echo "  make dev-web"

# ─────────────────────────────────────────
# Database
# ─────────────────────────────────────────

migrate-up:
	cd porjar-api && go run ./cmd/migrate up

migrate-down:
	cd porjar-api && go run ./cmd/migrate down

migrate-drop:
	cd porjar-api && go run ./cmd/migrate drop

seed:
	cd porjar-api && go run ./scripts/seed.go

# Fresh DB: drop, migrate, seed
db-fresh: migrate-drop migrate-up seed

# Docker: migrate inside container
docker-migrate:
	docker compose exec api go run ./cmd/migrate up

docker-seed:
	docker compose exec api go run ./scripts/seed.go

docker-db-fresh:
	docker compose exec api go run ./cmd/migrate drop
	docker compose exec api go run ./cmd/migrate up
	docker compose exec api go run ./scripts/seed.go

# ─────────────────────────────────────────
# Testing
# ─────────────────────────────────────────

test-api:
	cd porjar-api && go test ./... -v

test-api-cover:
	cd porjar-api && go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out

test-web:
	cd porjar-web && npm test

test: test-api

# ─────────────────────────────────────────
# Build
# ─────────────────────────────────────────

build-api:
	cd porjar-api && go build -o ./tmp/server ./cmd/server

build-web:
	cd porjar-web && npm run build

build: build-api build-web

# ─────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────

# Check Go build
check:
	cd porjar-api && go build ./... && go vet ./...

# Tidy Go modules
tidy:
	cd porjar-api && go mod tidy
