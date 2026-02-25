#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-fun_admin_postgres}"
POSTGRES_DB_USER="${POSTGRES_DB_USER:-fun_admin}"
POSTGRES_DB_NAME="${POSTGRES_DB_NAME:-fun_admin}"
POSTGRES_DB_PASSWORD="${POSTGRES_DB_PASSWORD:-fun_admin}"
BACKUP_FILE="${BACKUP_FILE:-${1:-}}"
KILL_ACTIVE_CONNECTIONS="${KILL_ACTIVE_CONNECTIONS:-1}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "BACKUP_FILE is required."
  echo "Example:"
  echo "  BACKUP_FILE=~/funzilla/backups/fun_admin_20260225_123000.dump npm run db:restore"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file was not found: $BACKUP_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for database restore."
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -x "$POSTGRES_CONTAINER_NAME" >/dev/null 2>&1; then
  echo "Postgres container not found: $POSTGRES_CONTAINER_NAME"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -x "$POSTGRES_CONTAINER_NAME" >/dev/null 2>&1; then
  echo "[db-restore] starting stopped container: $POSTGRES_CONTAINER_NAME"
  docker start "$POSTGRES_CONTAINER_NAME" >/dev/null
fi

echo "[db-restore] ensuring database exists: $POSTGRES_DB_NAME"
DB_EXISTS="$(
  docker exec -e PGPASSWORD="$POSTGRES_DB_PASSWORD" "$POSTGRES_CONTAINER_NAME" \
    psql -U "$POSTGRES_DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB_NAME'" \
    | tr -d '[:space:]'
)"

if [[ "$DB_EXISTS" != "1" ]]; then
  docker exec -e PGPASSWORD="$POSTGRES_DB_PASSWORD" "$POSTGRES_CONTAINER_NAME" \
    psql -U "$POSTGRES_DB_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB_NAME\";"
fi

if [[ "$KILL_ACTIVE_CONNECTIONS" == "1" ]]; then
  echo "[db-restore] terminating active sessions on $POSTGRES_DB_NAME"
  docker exec -e PGPASSWORD="$POSTGRES_DB_PASSWORD" "$POSTGRES_CONTAINER_NAME" \
    psql -U "$POSTGRES_DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB_NAME' AND pid <> pg_backend_pid();" >/dev/null
fi

echo "[db-restore] restoring from: $BACKUP_FILE"
docker exec -i -e PGPASSWORD="$POSTGRES_DB_PASSWORD" "$POSTGRES_CONTAINER_NAME" \
  pg_restore \
  -U "$POSTGRES_DB_USER" \
  -d "$POSTGRES_DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges < "$BACKUP_FILE"

echo "[db-restore] restore completed"
