# Server Deployment (PM2 + Portman + Cloudflare)

This runbook deploys:
- `fun-admin` (React UI + API middleware + Postgres)
- `funzilla-app` Expo dev server (for ongoing mobile testing)

It assumes your server already has the image crawler/services running.

## 1) Prerequisites on server

Install system/runtime tools:

```bash
sudo apt update
sudo apt install -y git curl build-essential docker.io docker-compose-plugin
sudo npm i -g pm2
```

Optional but supported by scripts:
- `portman` installed and available in `PATH`
- Either `docker compose` plugin or legacy `docker-compose` binary
- If compose is unavailable, script falls back to `docker run` for Postgres.
- If local `psql` is unavailable, schema apply falls back to `docker exec ... psql`.

## 2) Clone repositories on server

```bash
mkdir -p ~/funzilla
cd ~/funzilla
git clone https://github.com/frankr/fun-admin.git
git clone https://github.com/frankr/funzilla-app.git
```

## 3) Start admin service (PM2)

From `fun-admin`:

```bash
cd ~/funzilla/fun-admin
npm run pm2:up
```

What this script does:
- Uses `portman` for `ADMIN_PORT` if available (otherwise finds next free port starting at `5173`)
- Writes `.env.server` with `ADMIN_PORT` and `DATABASE_URL`
- Starts Postgres container (`docker compose up -d postgres`)
- Applies schema (`npm run db:apply`)
- Builds app
- Starts/restarts PM2 process `fun-admin`

Optional first-time seed during deploy:

```bash
cd ~/funzilla/fun-admin
CSV_FILE="/path/Funzinga Activity Database - 2026-0224.csv" \
APPROVED_IMAGES_FILE="/path/approved-images-2026-02-25.jsonl" \
FUNCRAWL_BASE_URL="https://funcrawl.buildwithspark.com" \
npm run pm2:up
```

## 4) Start mobile Expo service (PM2)

From `funzilla-app`:

```bash
cd ~/funzilla/funzilla-app
EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" npm run pm2:up
```

What this script does:
- Uses `portman` for `EXPO_PORT` if available (fallback starts at `8081`)
- Writes `.env.server` with `EXPO_PORT`, `EXPO_HOST`, `EXPO_PUBLIC_API_BASE_URL`
- Syncs `.env` for Expo
- Starts/restarts PM2 process `funzilla-expo`

Default Expo host mode is `lan`. To run with tunnel:

```bash
cd ~/funzilla/funzilla-app
EXPO_HOST=tunnel EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" npm run pm2:up
```

## 5) One command to bring up both services

From `fun-admin`:

```bash
cd ~/funzilla/fun-admin
EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" npm run pm2:up:stack
```

This runs admin first, then mobile.

## 5b) One command to sync + (optional) DB migrate + start stack

Use deploy orchestrator to reduce manual steps:

```bash
cd ~/funzilla/fun-admin
EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" npm run deploy:stack
```

It will:
- pull latest `main` in `fun-admin` and `funzilla-app`,
- optionally import DB from a remote server,
- then run `pm2:up:stack`.

With remote DB copy + restore in same command:

```bash
cd ~/funzilla/fun-admin
IMPORT_REMOTE_DB=1 \
SOURCE_SSH="user@source-host" \
EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" \
npm run deploy:stack
```

## 6) Make PM2 persistent across reboot

Run once:

```bash
pm2 startup
pm2 save
```

Use `pm2 status` and `pm2 logs` for monitoring.

## 7) Cloudflare + reverse proxy

You should proxy HTTP through Nginx/Caddy on ports `80/443` instead of exposing PM2 ports directly.

### Cloudflare DNS
- `admin.yourdomain.com` -> server public IP (`Proxied`)
- Optional `expo.yourdomain.com` -> server public IP (`DNS only` recommended for Expo dev server)

### Nginx example for admin

```nginx
server {
  listen 80;
  server_name admin.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:5173; # replace with ADMIN_PORT from .env.server
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

If `ADMIN_PORT` is dynamic, read it from `~/funzilla/fun-admin/.env.server` and update proxy config accordingly.

### Nginx example for Expo (optional, dev only)

```nginx
server {
  listen 80;
  server_name expo.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:8081; # replace with EXPO_PORT
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

## 8) Important production note about Expo

Running `expo start` in PM2 is useful for development/testing, not for final production app serving.

For production mobile clients:
- Build installable binaries with EAS (`eas build`)
- Host only your API + assets in production
- Use Expo updates/release channels for OTA updates

## 9) Quick operations

```bash
pm2 restart fun-admin --update-env
pm2 restart funzilla-expo --update-env
pm2 logs fun-admin
pm2 logs funzilla-expo
pm2 save
```

## 10) Database backup / restore with SCP

Create backup on source server:

```bash
cd ~/funzilla/fun-admin
BACKUP_DIR=~/funzilla/backups npm run db:backup
```

This creates:
- `~/funzilla/backups/fun_admin_<timestamp>.dump`
- `~/funzilla/backups/fun_admin_<timestamp>.dump.sha256`

Copy backup file with `scp`:

```bash
scp user@source-server:~/funzilla/backups/fun_admin_YYYYMMDD_HHMMSS.dump \
  user@target-server:~/funzilla/backups/
scp user@source-server:~/funzilla/backups/fun_admin_YYYYMMDD_HHMMSS.dump.sha256 \
  user@target-server:~/funzilla/backups/
```

Optional checksum verify on target:

```bash
cd ~/funzilla/backups
shasum -a 256 -c fun_admin_YYYYMMDD_HHMMSS.dump.sha256
```

Restore on target server:

```bash
cd ~/funzilla/fun-admin
BACKUP_FILE=~/funzilla/backups/fun_admin_YYYYMMDD_HHMMSS.dump npm run db:restore
```

One-command transfer + restore on target:

```bash
cd ~/funzilla/fun-admin
SOURCE_SSH="user@source-host" npm run db:transfer
```

Then start/update services:

```bash
cd ~/funzilla/fun-admin
ADMIN_PORT=5173 EXPO_PUBLIC_API_BASE_URL="https://admin.yourdomain.com" npm run pm2:up:stack
```

## 11) Optional: move `fun-crawl` under the same parent directory

If `fun-crawl` currently runs and serves images correctly, move it only during a maintenance window.

Suggested process:

```bash
# example only, adjust service name/path to your current setup
pm2 stop fun-crawl
mkdir -p ~/funzilla
mv /current/path/fun-crawl ~/funzilla/fun-crawl
pm2 start ~/funzilla/fun-crawl/<your-start-command> --name fun-crawl
pm2 save
```

Safety checks after move:
- Existing `funcrawl` image URLs still load in browser.
- Admin pages still show approved images.
- If needed, create a symlink from old path to new path during transition.
