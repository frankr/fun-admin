#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

FUNZILLA_APP_DIR="${FUNZILLA_APP_DIR:-$ROOT_DIR/../funzilla-app}"
ADMIN_SCRIPT="$ROOT_DIR/scripts/server/pm2-up-admin.sh"
ADMIN_ENV_FILE="$ROOT_DIR/.env.server"

if [[ ! -x "$ADMIN_SCRIPT" ]]; then
  chmod +x "$ADMIN_SCRIPT"
fi

bash "$ADMIN_SCRIPT"

if [[ -f "$ADMIN_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ADMIN_ENV_FILE"
  set +a
fi

if [[ ! -d "$FUNZILLA_APP_DIR" ]]; then
  echo "funzilla-app directory was not found: $FUNZILLA_APP_DIR"
  echo "Set FUNZILLA_APP_DIR to the correct path and rerun."
  exit 1
fi

MOBILE_SCRIPT="$FUNZILLA_APP_DIR/scripts/server/pm2-up-expo.sh"
if [[ ! -f "$MOBILE_SCRIPT" ]]; then
  echo "Mobile startup script missing: $MOBILE_SCRIPT"
  echo "Pull latest funzilla-app on the server first."
  exit 1
fi

if [[ ! -x "$MOBILE_SCRIPT" ]]; then
  chmod +x "$MOBILE_SCRIPT"
fi

if [[ -z "${EXPO_PUBLIC_API_BASE_URL:-}" ]]; then
  if [[ -n "${ADMIN_PUBLIC_BASE_URL:-}" ]]; then
    EXPO_PUBLIC_API_BASE_URL="$ADMIN_PUBLIC_BASE_URL"
  fi
fi

if [[ -z "${EXPO_PUBLIC_API_BASE_URL:-}" ]]; then
  echo "EXPO_PUBLIC_API_BASE_URL is required for the mobile app."
  echo "Set it to your public admin URL (example: https://admin.yourdomain.com)."
  echo "You can pass it inline:"
  echo "  EXPO_PUBLIC_API_BASE_URL=https://admin.yourdomain.com npm run pm2:up:stack"
  exit 1
fi

(
  cd "$FUNZILLA_APP_DIR"
  EXPO_PUBLIC_API_BASE_URL="$EXPO_PUBLIC_API_BASE_URL" bash scripts/server/pm2-up-expo.sh
)

echo
echo "Stack is running under PM2."
pm2 status
