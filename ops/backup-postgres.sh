#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE="${POSTGRES_SERVICE:-postgres}"
DATABASE="${POSTGRES_DB:-cartagena_db}"
USER="${POSTGRES_USER:-cartagena_user}"
OUTPUT_DIR="${BACKUP_DIR:-backups}"

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE_NAME="$DATABASE-$TIMESTAMP.dump"

docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" \
  pg_dump -U "$USER" -d "$DATABASE" -Fc -f "/backups/$FILE_NAME"

test -f "$OUTPUT_DIR/$FILE_NAME"
echo "Backup created: $OUTPUT_DIR/$FILE_NAME"
