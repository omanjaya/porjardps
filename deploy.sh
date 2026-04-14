#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Deploying ESI Denpasar..."

# Pull latest
git pull --rebase

# Build images in parallel
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://esidenpasar.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://esidenpasar.com/ws/connection/websocket \
  -t porjar/web:latest porjar-web &
WEB_PID=$!

docker build -t porjar/api:latest porjar-api &
API_PID=$!

wait $WEB_PID && echo "Web built"
wait $API_PID && echo "API built"

# Run migrations
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T api /app/porjar-migrate up 2>&1 | tail -5 || true

# Deploy
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate web api

sleep 10

# Verify
echo "Container status:"
docker ps --format "{{.Names}}\t{{.Status}}" | grep porjar

echo "API health:"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9090/api/v1/stats/public

echo "Web health:"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4200

echo "Deploy complete at $(date)"
