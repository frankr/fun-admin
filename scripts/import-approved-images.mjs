#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

function parseArgs(argv) {
  const args = {
    file: null,
    dryRun: false,
    storageProvider: 'fun-crawl',
    createdBy: 'approved-images-import',
    funCrawlBaseUrl: process.env.FUN_CRAWL_BASE_URL ?? '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--file') {
      args.file = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--storage-provider') {
      args.storageProvider = argv[i + 1] ?? args.storageProvider;
      i += 1;
      continue;
    }

    if (token === '--created-by') {
      args.createdBy = argv[i + 1] ?? args.createdBy;
      i += 1;
      continue;
    }

    if (token === '--funcrawl-base-url') {
      args.funCrawlBaseUrl = argv[i + 1] ?? args.funCrawlBaseUrl;
      i += 1;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      return { ...args, help: true };
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function printUsage() {
  console.log(
    `Usage:\n  node scripts/import-approved-images.mjs --file <approved-images.jsonl> [--storage-provider fun-crawl] [--funcrawl-base-url https://funcrawl.buildwithspark.com] [--dry-run] [--created-by <name>]\n`,
  );
}

function cleanText(value) {
  if (value == null) {
    return null;
  }

  const result = String(value).trim();
  return result === '' ? null : result;
}

function parseApprovedAt(value) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function parseJsonl(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  const records = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      throw new Error(`Invalid JSONL at line ${i + 1}: ${message}`);
    }
  }

  return records;
}

function normalizeBaseUrl(rawValue) {
  const cleaned = cleanText(rawValue);
  if (!cleaned) {
    return null;
  }
  return cleaned.replace(/\/+$/, '');
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeImageUrl(rawValue, baseUrl) {
  const cleaned = cleanText(rawValue);
  if (!cleaned) {
    return null;
  }

  if (isAbsoluteUrl(cleaned)) {
    return cleaned;
  }

  if (!baseUrl) {
    return null;
  }

  if (cleaned.startsWith('/')) {
    return `${baseUrl}${cleaned}`;
  }

  return `${baseUrl}/${cleaned.replace(/^\/+/, '')}`;
}

function deriveDomainSlug(rawUrl) {
  const cleaned = cleanText(rawUrl);
  if (!cleaned) {
    return null;
  }

  try {
    const parsedUrl = new URL(cleaned);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname) {
      return null;
    }

    const hostnameWithoutTld = hostname.includes('.')
      ? hostname.slice(0, hostname.lastIndexOf('.'))
      : hostname;

    const slug = hostnameWithoutTld
      .replace(/[.-]/g, '_')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return slug || null;
  } catch {
    return null;
  }
}

function deriveDomainSlugFromFilename(filename) {
  const cleaned = cleanText(filename);
  if (!cleaned) {
    return null;
  }

  const withoutExt = cleaned.replace(/\.[^.]+$/, '');
  const match = withoutExt.match(/^(?:\d+_)?[A-Z]{2}\d+_([a-z0-9_]+)_\d+$/i);
  return cleanText(match?.[1] ?? null);
}

function deriveActivitySlug(row, externalId, images) {
  const explicitSlug = cleanText(row.slug);
  if (explicitSlug) {
    return explicitSlug;
  }

  const urlSlug = deriveDomainSlug(row.url);
  if (urlSlug && externalId) {
    return `${externalId}-${urlSlug}`;
  }

  for (const image of images) {
    const filenameSlug =
      deriveDomainSlugFromFilename(image.sourceFilename) ??
      deriveDomainSlugFromFilename(image.filename);
    if (filenameSlug && externalId) {
      return `${externalId}-${filenameSlug}`;
    }
  }

  return null;
}

function buildFunCrawlImageUrl(baseUrl, slug, tier, filename) {
  if (!baseUrl || !slug || !tier || !filename) {
    return null;
  }

  return `${baseUrl}/api/images/${encodeURIComponent(slug)}/${encodeURIComponent(tier)}/${encodeURIComponent(filename)}`;
}

async function ensureImageSlots(client, activityId) {
  for (let rank = 1; rank <= 5; rank += 1) {
    await client.query(
      `INSERT INTO activity_images (activity_id, rank_order, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (activity_id, rank_order) DO NOTHING`,
      [activityId, rank],
    );
  }
}

async function setIssueOpen(client, activityId, issueCode, message, latestBatchId, createdBy) {
  await client.query(
    `INSERT INTO activity_data_issues (
      activity_id,
      field_name,
      issue_code,
      issue_message,
      latest_batch_id,
      status
    ) VALUES ($1, 'Images', $2, $3, $4, 'open')
    ON CONFLICT (activity_id, field_name, issue_code)
    WHERE status = 'open'
    DO UPDATE SET
      issue_message = EXCLUDED.issue_message,
      latest_batch_id = EXCLUDED.latest_batch_id,
      last_detected_at = NOW(),
      resolved_at = NULL,
      resolved_by = NULL,
      resolution_note = NULL`,
    [activityId, issueCode, message, latestBatchId],
  );

  await client.query(
    `UPDATE activity_data_issues
     SET status = 'resolved', resolved_at = NOW(), resolved_by = $2, resolution_note = 'Superseded by new image issue state'
     WHERE activity_id = $1
       AND field_name = 'Images'
       AND issue_code <> $3
       AND status = 'open'
       AND issue_code IN ('NO_APPROVED_IMAGES', 'APPROVED_IMAGES_EXCEED_LIMIT')`,
    [activityId, createdBy, issueCode],
  );
}

async function resolveIssue(client, activityId, issueCode, createdBy) {
  await client.query(
    `UPDATE activity_data_issues
     SET status = 'resolved', resolved_at = NOW(), resolved_by = $3, resolution_note = 'Resolved by approved image import'
     WHERE activity_id = $1
       AND field_name = 'Images'
       AND issue_code = $2
       AND status = 'open'`,
    [activityId, issueCode, createdBy],
  );
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.file) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const resolvedFile = path.resolve(process.cwd(), args.file);
  const content = await fs.readFile(resolvedFile, 'utf8');
  const records = parseJsonl(content);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const summary = {
    rows: records.length,
    activitiesFound: 0,
    activitiesMissing: 0,
    activitiesUpdated: 0,
    approvedImagesImported: 0,
    publicUrlsImported: 0,
    imagesMissingPublicUrl: 0,
    overflowImagesSkipped: 0,
    missingImageRows: 0,
    duplicateActivityRows: 0,
    inferredSlugs: 0,
    missingSlugs: 0,
  };

  const missingActivityIds = [];
  const seenActivityIds = new Set();

  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user', args.createdBy]);

    const cityResult = await client.query('SELECT id FROM cities WHERE code = $1', ['HOU']);
    if (cityResult.rowCount === 0) {
      throw new Error('City HOU is missing from cities table. Apply schema first.');
    }

    const batchResult = await client.query(
      `INSERT INTO import_batches (
        city_id,
        source_filename,
        status,
        total_rows,
        created_by
      ) VALUES ($1, $2, 'running', $3, $4)
      RETURNING id`,
      [cityResult.rows[0].id, path.basename(resolvedFile), records.length, args.createdBy],
    );

    const batchId = batchResult.rows[0].id;
    const normalizedBaseUrl = normalizeBaseUrl(args.funCrawlBaseUrl);

    for (let i = 0; i < records.length; i += 1) {
      const row = records[i];
      const rowNumber = i + 1;
      const externalId = cleanText(row.activity_id)?.toUpperCase() ?? null;
      const approvedAt = parseApprovedAt(row.approved_at);

      if (!externalId) {
        summary.activitiesMissing += 1;
        await client.query(
          `INSERT INTO import_row_results (
            batch_id,
            row_number,
            external_id,
            action,
            error_message
          ) VALUES ($1, $2, $3, 'error', $4)`,
          [batchId, rowNumber, null, 'Missing activity_id in JSONL row'],
        );
        continue;
      }

      if (seenActivityIds.has(externalId)) {
        summary.duplicateActivityRows += 1;
      }
      seenActivityIds.add(externalId);

      const activityResult = await client.query(
        'SELECT id FROM activities WHERE external_id = $1',
        [externalId],
      );

      if (activityResult.rowCount === 0) {
        summary.activitiesMissing += 1;
        missingActivityIds.push(externalId);
        await client.query(
          `INSERT INTO import_row_results (
            batch_id,
            row_number,
            external_id,
            action,
            error_message
          ) VALUES ($1, $2, $3, 'error', $4)`,
          [batchId, rowNumber, externalId, 'Activity not found in admin database'],
        );
        continue;
      }

      const activityId = activityResult.rows[0].id;
      summary.activitiesFound += 1;

      await ensureImageSlots(client, activityId);

      await client.query(
        `UPDATE activity_images
         SET
           status = 'pending',
           storage_provider = NULL,
           storage_key = NULL,
           source_filename = NULL,
           public_url = NULL,
           width_px = NULL,
           height_px = NULL,
           review_classification = NULL,
           alt_text = NULL,
           approved_at = NULL
         WHERE activity_id = $1`,
        [activityId],
      );

      const images = Array.isArray(row.images) ? row.images : [];
      if (images.length === 0) {
        summary.missingImageRows += 1;
      }

      const normalizedImages = images
        .map((img, index) => ({
          rank: Number(img.rank ?? index + 1),
          filename: cleanText(img.filename),
          sourceFilename: cleanText(img.source_filename),
          tier: cleanText(img.tier ?? row.image_tier) ?? 'picks',
          classification: cleanText(img.classification),
          description: cleanText(img.ai_description),
          imageUrl: normalizeImageUrl(img.image_url ?? img.public_url, normalizedBaseUrl),
        }))
        .filter((img) => Number.isFinite(img.rank) && img.filename);

      normalizedImages.sort((a, b) => a.rank - b.rank);
      const slug = deriveActivitySlug(row, externalId, normalizedImages);

      if (!cleanText(row.slug) && slug) {
        summary.inferredSlugs += 1;
      }
      if (!slug) {
        summary.missingSlugs += 1;
      }

      const selected = normalizedImages.filter((img) => img.rank >= 1 && img.rank <= 5);
      const overflow = normalizedImages.filter((img) => img.rank > 5 || img.rank < 1);
      summary.overflowImagesSkipped += overflow.length;

      let importedForActivity = 0;

      for (const image of selected) {
        const publicUrl =
          image.imageUrl ??
          buildFunCrawlImageUrl(normalizedBaseUrl, slug, image.tier, image.filename);
        const storageKey = slug
          ? `${slug}/${image.tier}/${image.filename}`
          : image.filename;

        if (publicUrl) {
          summary.publicUrlsImported += 1;
        } else {
          summary.imagesMissingPublicUrl += 1;
        }

        await client.query(
          `INSERT INTO activity_images (
             activity_id,
             rank_order,
             storage_provider,
             storage_key,
             source_filename,
             public_url,
             review_classification,
             alt_text,
             approved_at,
             status
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, 'ready'
           )
           ON CONFLICT (activity_id, rank_order)
           DO UPDATE SET
             storage_provider = EXCLUDED.storage_provider,
             storage_key = EXCLUDED.storage_key,
             source_filename = EXCLUDED.source_filename,
             public_url = EXCLUDED.public_url,
             review_classification = EXCLUDED.review_classification,
             alt_text = EXCLUDED.alt_text,
             approved_at = EXCLUDED.approved_at,
             status = 'ready'`,
          [
            activityId,
            image.rank,
            args.storageProvider,
            storageKey,
            image.sourceFilename,
            publicUrl,
            image.classification,
            image.description,
            approvedAt,
          ],
        );
        importedForActivity += 1;
      }

      summary.approvedImagesImported += importedForActivity;
      summary.activitiesUpdated += 1;

      if (importedForActivity === 0) {
        await setIssueOpen(
          client,
          activityId,
          'NO_APPROVED_IMAGES',
          'No approved images were imported for this activity.',
          batchId,
          args.createdBy,
        );
      } else {
        await resolveIssue(client, activityId, 'NO_APPROVED_IMAGES', args.createdBy);
      }

      if (overflow.length > 0) {
        await setIssueOpen(
          client,
          activityId,
          'APPROVED_IMAGES_EXCEED_LIMIT',
          'More than 5 approved images were provided. Only ranks 1-5 were imported.',
          batchId,
          args.createdBy,
        );
      } else {
        await resolveIssue(client, activityId, 'APPROVED_IMAGES_EXCEED_LIMIT', args.createdBy);
      }

      await client.query(
        `INSERT INTO import_row_results (
          batch_id,
          row_number,
          external_id,
          activity_id,
          action,
          warning_count,
          cleaned_fields
        ) VALUES ($1, $2, $3, $4, 'updated', $5, $6)`,
        [
          batchId,
          rowNumber,
          externalId,
          activityId,
          overflow.length,
          JSON.stringify({
            importedImageCount: importedForActivity,
            overflowImageCount: overflow.length,
            slug,
          }),
        ],
      );
    }

    await client.query(
      `UPDATE import_batches
       SET
         completed_at = clock_timestamp(),
         status = $2,
         updated_count = $3,
         warning_count = $4,
         error_count = $5,
         notes = $6
       WHERE id = $1`,
      [
        batchId,
        summary.activitiesMissing > 0 ? 'completed_with_errors' : 'completed',
        summary.activitiesUpdated,
        summary.overflowImagesSkipped,
        summary.activitiesMissing,
        args.dryRun ? 'Dry run - rolled back' : null,
      ],
    );

    if (args.dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    console.log('Approved image import summary');
    console.log(`- File: ${resolvedFile}`);
    console.log(`- Rows processed: ${summary.rows}`);
    console.log(`- Activities found: ${summary.activitiesFound}`);
    console.log(`- Activities missing: ${summary.activitiesMissing}`);
    console.log(`- Activities updated: ${summary.activitiesUpdated}`);
    console.log(`- Approved images imported: ${summary.approvedImagesImported}`);
    console.log(`- Images with public URLs: ${summary.publicUrlsImported}`);
    console.log(`- Images missing public URLs: ${summary.imagesMissingPublicUrl}`);
    console.log(`- Overflow images skipped: ${summary.overflowImagesSkipped}`);
    console.log(`- Rows with zero approved images: ${summary.missingImageRows}`);
    console.log(`- Duplicate activity rows in file: ${summary.duplicateActivityRows}`);
    console.log(`- Slugs inferred from legacy fields: ${summary.inferredSlugs}`);
    console.log(`- Rows missing slug for URL build: ${summary.missingSlugs}`);
    console.log(`- Mode: ${args.dryRun ? 'DRY RUN (rolled back)' : 'COMMIT'}`);

    if (missingActivityIds.length > 0) {
      console.log(`- Missing activity IDs: ${[...new Set(missingActivityIds)].join(', ')}`);
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // no-op
    }
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Approved image import failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
