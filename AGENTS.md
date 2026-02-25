# Funzilla Server Operator Guide (Codex First Read)

Read this file first when operating the server deployment for Funzilla.

## Canonical server directory layout

Use one parent directory:

```text
~/funzilla/
  fun-admin/
  funzilla-app/
  fun-crawl/   (optional to move here; see safe migration section)
```

`fun-admin` and `funzilla-app` are expected as sibling directories.

## Single-command stack startup

Run from `fun-admin` only:

```bash
cd ~/funzilla/fun-admin
EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" npm run pm2:up:stack
```

This command:
- boots Postgres container (if needed),
- applies DB schema,
- builds/starts `fun-admin` in PM2,
- then starts Expo server in `funzilla-app` via PM2.

## If `funzilla-app` is not a sibling directory

Set explicit path:

```bash
cd ~/funzilla/fun-admin
FUNZILLA_APP_DIR="/some/other/path/funzilla-app" \
EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" \
npm run pm2:up:stack
```

## PM2 service names
- `fun-admin`
- `funzilla-expo`

Useful commands:

```bash
pm2 status
pm2 logs fun-admin
pm2 logs funzilla-expo
pm2 restart fun-admin --update-env
pm2 restart funzilla-expo --update-env
pm2 save
```

## Safe `fun-crawl` move (do not break image serving)

If `fun-crawl` already serves images correctly, prefer leaving it in place until a maintenance window.

If you need to move it under `~/funzilla/fun-crawl`:
1. Stop only the `fun-crawl` PM2 process.
2. Move repo to new path.
3. Restart `fun-crawl` with same env/domain config.
4. Verify existing image URLs still resolve.
5. Optionally add symlink from old path to new path as fallback.

Do not change the public `funcrawl` base URL unless DNS/proxy is updated at the same time.

## Source of truth docs
- Deployment runbook: `docs/server-pm2-deployment.md`
- Production checklist: `docs/production-readiness.md`
- DB schema/import notes: `docs/database.md`
