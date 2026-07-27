#!/bin/bash
# Run database migrations on the server
# Called automatically by GitHub Actions deploy workflow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if it exists
if [ -f "$APP_DIR/.env" ]; then
  export $(grep -v '^#' "$APP_DIR/.env" | xargs)
fi

DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"

echo "==> Running database migrations..."
migrate -path "$APP_DIR/migrations" -database "$DATABASE_URL" up

echo "==> Migrations complete."
