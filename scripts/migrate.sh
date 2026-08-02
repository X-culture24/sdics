#!/bin/bash
# Run database migrations and seed data on the server

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load .env
if [ -f "$APP_DIR/.env" ]; then
  set -a
  source "$APP_DIR/.env"
  set +a
fi

DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"

# Install migrate if not present
if ! command -v migrate &> /dev/null; then
  echo "==> Installing golang-migrate..."
  curl -sL https://github.com/golang-migrate/migrate/releases/download/v4.17.1/migrate.linux-amd64.tar.gz | tar xvz -C /tmp
  sudo mv /tmp/migrate /usr/local/bin/migrate
fi

echo "==> Running migrations..."
migrate -path "$APP_DIR/migrations" -database "$DATABASE_URL" up
echo "==> Migrations complete."

# Run seed only if users table is empty
USER_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
if [ "$USER_COUNT" = "0" ]; then
  echo "==> Seeding database..."
  psql "$DATABASE_URL" -f "$APP_DIR/scripts/seed.sql"
  echo "==> Seed complete."
else
  echo "==> Database already seeded, skipping."
fi
