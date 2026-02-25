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

## Image storage recommendation
Store image files in object storage (S3/R2/GCS/Supabase Storage), not in Postgres.
Store only metadata in `activity_images` and join via `activity_id`.
