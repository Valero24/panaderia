#!/usr/bin/env sh
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: ./ops/restore-postgres.sh backups/file.dump" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE="${POSTGRES_SERVICE:-postgres}"
DATABASE="${POSTGRES_DB:-cartagena_db}"
USER="${POSTGRES_USER:-cartagena_user}"
BACKUP_FILE="$1"
FILE_NAME="$(basename "$BACKUP_FILE")"

mkdir -p backups

SOURCE_PATH="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$FILE_NAME"
TARGET_PATH="$(cd backups && pwd)/$FILE_NAME"

if [ "$SOURCE_PATH" != "$TARGET_PATH" ]; then
  cp "$BACKUP_FILE" "backups/$FILE_NAME"
fi

docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" \
  pg_restore -U "$USER" -d "$DATABASE" --clean --if-exists --no-owner "/backups/$FILE_NAME"

echo "Restore completed from: $BACKUP_FILE"
