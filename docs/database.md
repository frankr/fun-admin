# Database setup and CSV import

## Why Postgres (recommended)
Postgres is the best fit for this admin platform because it gives you:
- Strong relational modeling for activities, images, cities, taxonomy, and imports.
- ACID transactions for safe bulk imports.
- Rich indexing/search options as catalog size grows across cities.
- Trigger-based audit/version history without extra infrastructure.

Other viable options:
- MySQL: also workable for relational data, but weaker ecosystem for JSON/audit patterns used here.
- MongoDB/Document DB: fast to start, but less ideal for taxonomy joins, integrity constraints, and audit trail rigor.
- Supabase (managed Postgres): same data model, less ops overhead.

## What this schema includes
- Core activities keyed by your private `external_id` (ex: `HT00001`).
- City support (seeded with `HOU`).
- Fixed age-group taxonomy.
- Activity types and location types.
- Activity image metadata (ranked 1-5 per activity).
- Full import tracking (`import_batches`, `import_row_results`, `import_warnings`).
- Open issue queue for admin review (`activity_data_issues`).
- Version history via audit log (`activity_change_log`).

## Apply schema
```bash
export DATABASE_URL='postgres://user:password@localhost:5432/fun_admin'
npm run db:apply
```

## Local Postgres (Docker)
Start container:
```bash
npm run db:local:up
```

Apply schema (uses containerized `psql`, no local `psql` required):
```bash
npm run db:local:apply
```

## Import CSV
Dry run (recommended first):
```bash
npm run db:import:activities -- --file "Funzinga Activity Database - 2026-0224.csv" --city-code HOU --dry-run
```

Commit import:
```bash
npm run db:import:activities -- --file "Funzinga Activity Database - 2026-0224.csv" --city-code HOU
```

Shortcuts for local Docker DB:
```bash
npm run db:local:import:houston:dry-run
npm run db:local:import:houston
npm run db:local:import:approved-images:dry-run
npm run db:local:import:approved-images
npm run db:local:bootstrap:houston
```

Stop local DB:
```bash
npm run db:local:down
```

Reset local DB (drops volume/data):
```bash
npm run db:local:reset
```

## Import behavior
- Upserts by `external_id` (dedupe-safe for repeated imports).
- Auto-cleans when possible (website protocol, phone extraction/normalization).
- Logs warnings in `import_warnings`.
- Creates/updates open review issues in `activity_data_issues` when manual review is needed.
- Replaces locations, age groups, and activity types per imported row so source-of-truth stays aligned.

## Approved image sync (from fun-crawl export)
Import approved image JSONL from the image review app:
```bash
npm run db:import:approved-images -- --file "approved-images-2026-02-25.jsonl" --funcrawl-base-url "https://funcrawl.buildwithspark.com"
```

What this sync does:
- Matches each JSONL row by `activity_id` → `activities.external_id`.
- Updates `activity_images` ranks `1..5` with `status='ready'` and review metadata.
- Resets stale image slots back to `pending` when not present in the latest export.
- Opens/resolves image issues in `activity_data_issues` (no approved images, >5 images supplied).
- Persists `public_url` when provided by export (`image_url`) or builds it from `--funcrawl-base-url`.
- Supports legacy JSONL exports without `slug` by inferring slug from URL/filenames.

Activity readiness query:
```sql
SELECT external_id, activity_name, approved_image_count, has_approved_images, has_full_image_set, ready_for_live
FROM v_activity_readiness
ORDER BY external_id;

## Automatic sync during stack startup

You can keep admin console in sync automatically when image review exports an endpoint that serves JSONL.

Set one of:
- `APPROVED_IMAGES_FILE` for a local file
- `APPROVED_IMAGES_SYNC_URL` for a remote JSONL URL
- both together for layered workflows (both imports run)

Example:
```bash
APPROVED_IMAGES_SYNC_URL="https://funcrawl.funzilla.app/api/export/approved-images.jsonl" \
APPROVED_IMAGES_SYNC_BEARER_TOKEN="..." \
APPROVED_IMAGES_SYNC_REQUIRED=1 \
ADMIN_PORT=5173 \
EXPO_PUBLIC_API_BASE_URL="https://admin.funzilla.app" \
npm run pm2:up:stack
```

`APPROVED_IMAGES_SYNC_REQUIRED=1` makes startup fail if remote sync cannot be fetched.
If omitted, startup continues and logs a warning.

## Direct approval sync API (preferred)

For real-time integration, image review can push approvals directly into admin DB:

`POST /api/review/approvals`

Headers:
- `Authorization: Bearer <REVIEW_SYNC_TOKEN>` or `x-review-sync-token: <REVIEW_SYNC_TOKEN>`
- `Content-Type: application/json`
- optional: `x-sync-actor: image-review-service`

Example payload:
```json
{
  "activityId": "TX12345",
  "slug": "TX12345-some-domain",
  "approvedAt": "2026-02-25T12:34:56Z",
  "replaceExisting": false,
  "images": [
    {
      "rank": 1,
      "filename": "image_1.webp",
      "sourceFilename": "source_1.jpg",
      "tier": "picks",
      "classification": "hero",
      "aiDescription": "Kids playing in the splash area",
      "imageUrl": "https://funcrawl.funzilla.app/api/images/TX12345-some-domain/picks/image_1.webp"
    }
  ]
}
```

Behavior:
- upserts images into `activity_images` immediately;
- updates open/resolved image issues in `activity_data_issues`;
- supports event updates (`replaceExisting=false`) or full replacement (`replaceExisting=true`).

Required server env:
- `REVIEW_SYNC_TOKEN` (shared secret between review service and admin API).
```

## Image storage recommendation
Store image files in object storage (S3/R2/GCS/Supabase Storage), not in Postgres.
Store only metadata in `activity_images` and join via `activity_id`.
