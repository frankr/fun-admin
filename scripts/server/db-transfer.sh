#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SOURCE_SSH="${SOURCE_SSH:-}"
SOURCE_FUN_ADMIN_DIR="${SOURCE_FUN_ADMIN_DIR:-~/funzilla/fun-admin}"
SOURCE_BACKUP_DIR="${SOURCE_BACKUP_DIR:-~/funzilla/backups}"

TARGET_BACKUP_DIR="${TARGET_BACKUP_DIR:-$(cd "$ROOT_DIR/.." && pwd)/backups}"
REMOTE_BACKUP_BASENAME="${REMOTE_BACKUP_BASENAME:-fun_admin_transfer_$(date +%Y%m%d_%H%M%S).dump}"
SKIP_RESTORE="${SKIP_RESTORE:-0}"

log() {
  printf '[db-transfer] %s\n' "$1"
}

fail() {
  printf '[db-transfer] ERROR: %s\n' "$1" >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "missing required command: $cmd"
}

verify_checksum_portable() {
  local dir="$1"
  local dump_file="$2"
  local sha_file="$3"

  (
    cd "$dir"
    if shasum -a 256 -c "$sha_file" >/dev/null 2>&1; then
      log "checksum verified: $sha_file"
      return 0
    fi

    # Backward compatibility for old checksum files with absolute source paths.
    local hash
    hash="$(awk '{print $1}' "$sha_file" | head -n 1)"
    [[ -n "$hash" ]] || fail "could not parse checksum file: $sha_file"
    printf '%s  %s\n' "$hash" "$dump_file" > "${sha_file}.portable"
    shasum -a 256 -c "${sha_file}.portable" >/dev/null
    log "checksum verified with portable shim: ${sha_file}.portable"
  )
}

main() {
  [[ -n "$SOURCE_SSH" ]] || fail "set SOURCE_SSH (example: SOURCE_SSH=user@source-host)"
  require_cmd ssh
  require_cmd scp
  require_cmd npm

  mkdir -p "$TARGET_BACKUP_DIR"

  log "creating source backup on $SOURCE_SSH"
  ssh "$SOURCE_SSH" \
    "cd $SOURCE_FUN_ADMIN_DIR && BACKUP_DIR=$SOURCE_BACKUP_DIR BACKUP_BASENAME=$REMOTE_BACKUP_BASENAME npm run db:backup"

  log "copying backup to target: $TARGET_BACKUP_DIR"
  scp "$SOURCE_SSH:$SOURCE_BACKUP_DIR/$REMOTE_BACKUP_BASENAME" "$TARGET_BACKUP_DIR/"
  scp "$SOURCE_SSH:$SOURCE_BACKUP_DIR/$REMOTE_BACKUP_BASENAME.sha256" "$TARGET_BACKUP_DIR/" || true

  if [[ -f "$TARGET_BACKUP_DIR/$REMOTE_BACKUP_BASENAME.sha256" ]]; then
    verify_checksum_portable "$TARGET_BACKUP_DIR" "$REMOTE_BACKUP_BASENAME" "$REMOTE_BACKUP_BASENAME.sha256"
  else
    log "warning: no checksum file found; skipping checksum verification"
  fi

  local target_dump_file="$TARGET_BACKUP_DIR/$REMOTE_BACKUP_BASENAME"
  if [[ "$SKIP_RESTORE" == "1" ]]; then
    log "SKIP_RESTORE=1, backup copied only: $target_dump_file"
    exit 0
  fi

  log "restoring target database from: $target_dump_file"
  BACKUP_FILE="$target_dump_file" npm run db:restore
  log "database transfer complete"
}

main "$@"
