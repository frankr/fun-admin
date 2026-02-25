#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-fun_admin_postgres}"
POSTGRES_DB_USER="${POSTGRES_DB_USER:-fun_admin}"
POSTGRES_DB_NAME="${POSTGRES_DB_NAME:-fun_admin}"
POSTGRES_DB_PASSWORD="${POSTGRES_DB_PASSWORD:-fun_admin}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_BASENAME="${BACKUP_BASENAME:-fun_admin_$(date +%Y%m%d_%H%M%S).dump}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for database backup."
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -x "$POSTGRES_CONTAINER_NAME" >/dev/null 2>&1; then
  echo "Postgres container not found: $POSTGRES_CONTAINER_NAME"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -x "$POSTGRES_CONTAINER_NAME" >/dev/null 2>&1; then
  echo "[db-backup] starting stopped container: $POSTGRES_CONTAINER_NAME"
  docker start "$POSTGRES_CONTAINER_NAME" >/dev/null
fi

mkdir -p "$BACKUP_DIR"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_BASENAME"

echo "[db-backup] creating dump at: $BACKUP_PATH"
docker exec \
  -e PGPASSWORD="$POSTGRES_DB_PASSWORD" \
  "$POSTGRES_CONTAINER_NAME" \
  pg_dump \
  -U "$POSTGRES_DB_USER" \
  -d "$POSTGRES_DB_NAME" \
  -Fc > "$BACKUP_PATH"

(
  cd "$BACKUP_DIR"
  shasum -a 256 "$BACKUP_BASENAME" > "${BACKUP_BASENAME}.sha256"
)

echo "[db-backup] completed"
echo "  dump: $BACKUP_PATH"
echo "  sha : ${BACKUP_PATH}.sha256"
