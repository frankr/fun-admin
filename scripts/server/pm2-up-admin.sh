#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="${APP_NAME:-fun-admin}"
ENV_FILE="${ENV_FILE:-.env.server}"
DEFAULT_ADMIN_PORT="${DEFAULT_ADMIN_PORT:-5173}"
DEFAULT_DATABASE_URL="${DEFAULT_DATABASE_URL:-postgres://fun_admin:fun_admin@localhost:54329/fun_admin}"
CITY_CODE="${CITY_CODE:-HOU}"
FUNCRAWL_BASE_URL="${FUNCRAWL_BASE_URL:-https://funcrawl.buildwithspark.com}"
APPROVED_IMAGES_SYNC_URL="${APPROVED_IMAGES_SYNC_URL:-${APPROVED_IMAGES_EXPORT_URL:-}}"
APPROVED_IMAGES_SYNC_BEARER_TOKEN="${APPROVED_IMAGES_SYNC_BEARER_TOKEN:-${APPROVED_IMAGES_AUTH_TOKEN:-}}"
APPROVED_IMAGES_SYNC_TIMEOUT="${APPROVED_IMAGES_SYNC_TIMEOUT:-30}"
APPROVED_IMAGES_SYNC_REQUIRED="${APPROVED_IMAGES_SYNC_REQUIRED:-0}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-fun_admin_postgres}"
POSTGRES_DB_USER="${POSTGRES_DB_USER:-fun_admin}"
POSTGRES_DB_NAME="${POSTGRES_DB_NAME:-fun_admin}"
POSTGRES_DB_PASSWORD="${POSTGRES_DB_PASSWORD:-fun_admin}"

extract_first_port() {
  local raw="$1"
  local match
  match="$(printf '%s\n' "$raw" | grep -Eo '[0-9]{2,5}' | head -n 1 || true)"
  if [[ -n "$match" ]]; then
    printf '%s\n' "$match"
    return 0
  fi
  return 1
}

next_port_from_portman() {
  if ! command -v portman >/dev/null 2>&1; then
    return 1
  fi

  local output=""
  output="$(portman next 2>/dev/null || true)"
  if extract_first_port "$output" >/dev/null 2>&1; then
    extract_first_port "$output"
    return 0
  fi

  output="$(portman --next 2>/dev/null || true)"
  if extract_first_port "$output" >/dev/null 2>&1; then
    extract_first_port "$output"
    return 0
  fi

  output="$(portman get next 2>/dev/null || true)"
  if extract_first_port "$output" >/dev/null 2>&1; then
    extract_first_port "$output"
    return 0
  fi

  return 1
}

next_free_port_fallback() {
  local start_port="$1"
  local port="$start_port"
  while lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; do
    port=$((port + 1))
  done
  printf '%s\n' "$port"
}

resolve_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    printf 'docker|compose\n'
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    printf 'docker-compose|\n'
    return 0
  fi

  return 1
}

ensure_postgres_with_docker_only() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is not available; cannot bootstrap Postgres automatically."
    return 1
  fi

  local container_name="$POSTGRES_CONTAINER_NAME"
  local image_name="postgres:16-alpine"
  local container_exists
  container_exists="$(docker ps -a --format '{{.Names}}' | grep -x "$container_name" || true)"

  if [[ -n "$container_exists" ]]; then
    echo "[fun-admin] starting existing Postgres container: $container_name"
    docker start "$container_name" >/dev/null || true
  else
    echo "[fun-admin] creating Postgres container: $container_name"
    docker run -d \
      --name "$container_name" \
      --restart unless-stopped \
      -e POSTGRES_USER="$POSTGRES_DB_USER" \
      -e POSTGRES_PASSWORD="$POSTGRES_DB_PASSWORD" \
      -e POSTGRES_DB="$POSTGRES_DB_NAME" \
      -p 54329:5432 \
      -v fun_admin_postgres_data:/var/lib/postgresql/data \
      "$image_name" >/dev/null
  fi

  echo "[fun-admin] waiting for Postgres readiness"
  local retries=30
  local attempt=1
  while (( attempt <= retries )); do
    if docker exec "$container_name" pg_isready -U "$POSTGRES_DB_USER" -d "$POSTGRES_DB_NAME" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  echo "Postgres container did not become ready in time."
  return 1
}

apply_schema() {
  if command -v psql >/dev/null 2>&1; then
    echo "[fun-admin] applying schema via local psql"
    DATABASE_URL="$DATABASE_URL" npm run db:apply
    return 0
  fi

  echo "[fun-admin] local psql not found; applying schema via docker exec"
  docker exec -i "$POSTGRES_CONTAINER_NAME" psql -U "$POSTGRES_DB_USER" -d "$POSTGRES_DB_NAME" < db/schema.sql
}

download_approved_images_file() {
  local source_url="$1"
  local destination="$2"
  local auth_args=()

  if [[ -n "${APPROVED_IMAGES_SYNC_BEARER_TOKEN:-}" ]]; then
    auth_args=(-H "Authorization: Bearer ${APPROVED_IMAGES_SYNC_BEARER_TOKEN}")
  fi

  if command -v curl >/dev/null 2>&1; then
    echo "[fun-admin] downloading approved-image export with curl"
    if ! curl -fsSL --max-time "$APPROVED_IMAGES_SYNC_TIMEOUT" "${auth_args[@]}" "$source_url" -o "$destination"; then
      return 1
    fi
    return 0
  fi

  if command -v wget >/dev/null 2>&1; then
    echo "[fun-admin] downloading approved-image export with wget"
    if ! wget -q --timeout="$APPROVED_IMAGES_SYNC_TIMEOUT" -O "$destination" "$source_url"; then
      return 1
    fi
    return 0
  fi

  echo "Neither curl nor wget is available for approved-image sync."
  return 1
}

import_approved_images_file() {
  local source_file="$1"

  if [[ ! -s "$source_file" ]]; then
    echo "[fun-admin] approved-image source file is empty: $source_file"
    return 1
  fi

  echo "[fun-admin] importing approved images from $source_file"
  DATABASE_URL="$DATABASE_URL" node scripts/import-approved-images.mjs \
    --file "$source_file" \
    --funcrawl-base-url "$FUNCRAWL_BASE_URL"
}

sync_approved_images_from_url() {
  local source_url="$1"
  local temp_file=""

  temp_file="$(mktemp)"
  if download_approved_images_file "$source_url" "$temp_file"; then
    import_approved_images_file "$temp_file" || return 1
    rm -f "$temp_file"
    return 0
  fi

  echo "[fun-admin] failed to fetch approved images from $source_url"
  rm -f "$temp_file"
  return 1
}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

ADMIN_PORT="${ADMIN_PORT:-}"
DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-${REVIEW_PASSWORD:-}}"

if [[ -z "$ADMIN_PORT" ]]; then
  if ADMIN_PORT="$(next_port_from_portman)"; then
    :
  else
    ADMIN_PORT="$(next_free_port_fallback "$DEFAULT_ADMIN_PORT")"
  fi
fi

cat > "$ENV_FILE" <<EOF
ADMIN_PORT=$ADMIN_PORT
DATABASE_URL=$DATABASE_URL
EOF

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed. Install it first: npm i -g pm2"
  exit 1
fi

echo "[fun-admin] installing dependencies"
npm ci

COMPOSE_SELECTOR="$(resolve_compose_cmd || true)"
if [[ -z "$COMPOSE_SELECTOR" ]]; then
  echo "[fun-admin] compose tooling not found; using docker-only Postgres bootstrap."
  ensure_postgres_with_docker_only
else
  IFS='|' read -r COMPOSE_BIN COMPOSE_SUBCMD <<< "$COMPOSE_SELECTOR"
  if [[ -n "$COMPOSE_SUBCMD" ]]; then
    echo "[fun-admin] ensuring Postgres container is up using: $COMPOSE_BIN $COMPOSE_SUBCMD"
    "$COMPOSE_BIN" "$COMPOSE_SUBCMD" up -d postgres
  else
    echo "[fun-admin] ensuring Postgres container is up using: $COMPOSE_BIN"
    "$COMPOSE_BIN" up -d postgres
  fi
fi

echo "[fun-admin] applying schema"
apply_schema

if [[ -n "${CSV_FILE:-}" ]]; then
  echo "[fun-admin] importing activities from $CSV_FILE"
  DATABASE_URL="$DATABASE_URL" node scripts/import-activities.mjs --file "$CSV_FILE" --city-code "$CITY_CODE"
fi

if [[ -n "${APPROVED_IMAGES_FILE:-}" ]]; then
  if ! import_approved_images_file "$APPROVED_IMAGES_FILE"; then
    echo "[fun-admin] approved image import failed from APPROVED_IMAGES_FILE."
    [[ "${APPROVED_IMAGES_SYNC_REQUIRED}" == "1" ]] && exit 1
  fi
fi

if [[ -n "${APPROVED_IMAGES_SYNC_URL:-}" ]]; then
  if ! sync_approved_images_from_url "$APPROVED_IMAGES_SYNC_URL"; then
    echo "[fun-admin] approved image import failed from APPROVED_IMAGES_SYNC_URL."
    [[ "${APPROVED_IMAGES_SYNC_REQUIRED}" == "1" ]] && exit 1
  fi
fi

echo "[fun-admin] building web app"
npm run build

echo "[fun-admin] starting PM2 process $APP_NAME on port $ADMIN_PORT"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  if [[ -n "$ADMIN_PASSWORD" ]]; then
    ADMIN_PORT="$ADMIN_PORT" DATABASE_URL="$DATABASE_URL" ADMIN_PASSWORD="$ADMIN_PASSWORD" pm2 restart "$APP_NAME" --update-env
  else
    ADMIN_PORT="$ADMIN_PORT" DATABASE_URL="$DATABASE_URL" pm2 restart "$APP_NAME" --update-env
  fi
else
  if [[ -n "$ADMIN_PASSWORD" ]]; then
    ADMIN_PORT="$ADMIN_PORT" DATABASE_URL="$DATABASE_URL" ADMIN_PASSWORD="$ADMIN_PASSWORD" pm2 start npm --name "$APP_NAME" -- run serve:pm2
  else
    ADMIN_PORT="$ADMIN_PORT" DATABASE_URL="$DATABASE_URL" pm2 start npm --name "$APP_NAME" -- run serve:pm2
  fi
fi

pm2 save

echo
echo "fun-admin is running."
echo "  PM2 name: $APP_NAME"
echo "  Port: $ADMIN_PORT"
echo "  Database: $DATABASE_URL"
echo
echo "Tip: run 'pm2 startup' once on the server so services restart on reboot."
