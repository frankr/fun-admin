#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Client } = pg;

function parseArgs(argv) {
  const args = {
    file: null,
    cityCode: 'HOU',
    dryRun: false,
    createdBy: 'csv-import-script',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--file') {
      args.file = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--city-code') {
      args.cityCode = (argv[i + 1] ?? '').toUpperCase();
      i += 1;
      continue;
    }

    if (token === '--created-by') {
      args.createdBy = argv[i + 1] ?? args.createdBy;
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
  console.log(`Usage:\n  node scripts/import-activities.mjs --file <path-to-csv> [--city-code HOU] [--dry-run] [--created-by <name>]\n`);
}

function cleanText(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function cleanMultiline(value) {
  const base = cleanText(value);
  if (!base) {
    return null;
  }

  return base
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');
}

function splitMultiValue(value) {
  const base = cleanText(value);
  if (!base) {
    return [];
  }

  return [...new Set(base.split(',').map((item) => item.trim()).filter(Boolean))];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeWebsite(rawValue, warnings) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const hasProtocol = /^https?:\/\//i.test(value);
  const candidate = hasProtocol ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (!hasProtocol) {
      warnings.push({
        fieldName: 'Website',
        warningCode: 'WEBSITE_PROTOCOL_ADDED',
        message: 'Website was missing protocol; https:// was added automatically.',
        originalValue: value,
        cleanedValue: url.toString(),
        requiresReview: false,
      });
    }
    return url.toString();
  } catch {
    warnings.push({
      fieldName: 'Website',
      warningCode: 'WEBSITE_INVALID',
      message: 'Website URL is invalid and needs review.',
      originalValue: value,
      cleanedValue: null,
      requiresReview: true,
    });
    return null;
  }
}

function normalizeEmail(rawValue, warnings) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalized)) {
    warnings.push({
      fieldName: 'Email',
      warningCode: 'EMAIL_INVALID',
      message: 'Email format appears invalid and should be reviewed.',
      originalValue: value,
      cleanedValue: normalized,
      requiresReview: true,
    });
  }

  return normalized;
}

function alphaToDigit(char) {
  const c = char.toUpperCase();
  if ('ABC'.includes(c)) return '2';
  if ('DEF'.includes(c)) return '3';
  if ('GHI'.includes(c)) return '4';
  if ('JKL'.includes(c)) return '5';
  if ('MNO'.includes(c)) return '6';
  if ('PQRS'.includes(c)) return '7';
  if ('TUV'.includes(c)) return '8';
  if ('WXYZ'.includes(c)) return '9';
  return char;
}

function normalizePhone(rawValue, warnings) {
  const value = cleanText(rawValue);
  if (!value) {
    return { phoneRaw: null, phoneNormalized: null };
  }

  const vanityNormalized = value.replace(/[A-Za-z]/g, (ch) => alphaToDigit(ch));
  const extractedMatch = vanityNormalized.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);

  let candidateRaw = null;
  if (extractedMatch?.[0]) {
    candidateRaw = extractedMatch[0].replace(/\s+/g, ' ').trim();
  } else {
    const digits = vanityNormalized.replace(/\D/g, '');
    if (digits.length >= 10) {
      candidateRaw = digits.slice(0, digits.length === 11 && digits.startsWith('1') ? 11 : 10);
    }
  }

  if (!candidateRaw) {
    warnings.push({
      fieldName: 'Phone Number',
      warningCode: 'PHONE_INVALID',
      message: 'Phone number could not be parsed and needs review.',
      originalValue: value,
      cleanedValue: null,
      requiresReview: true,
    });

    return {
      phoneRaw: value,
      phoneNormalized: null,
    };
  }

  const digits = candidateRaw.replace(/\D/g, '');
  let normalized = null;

  if (digits.length === 10) {
    normalized = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    normalized = `+${digits}`;
  } else {
    warnings.push({
      fieldName: 'Phone Number',
      warningCode: 'PHONE_INVALID_LENGTH',
      message: 'Phone number format could not be normalized to a US number.',
      originalValue: value,
      cleanedValue: candidateRaw,
      requiresReview: true,
    });
  }

  if (value !== candidateRaw) {
    warnings.push({
      fieldName: 'Phone Number',
      warningCode: 'PHONE_EXTRA_TEXT_REMOVED',
      message: 'Phone number contained extra text that was removed during import.',
      originalValue: value,
      cleanedValue: candidateRaw,
      requiresReview: false,
    });
  }

  return {
    phoneRaw: candidateRaw,
    phoneNormalized: normalized,
  };
}

function normalizeYesNo(rawValue, fieldName, warnings) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const lowered = value.toLowerCase();
  if (lowered === 'yes') {
    return true;
  }

  if (lowered === 'no') {
    return false;
  }

  warnings.push({
    fieldName,
    warningCode: 'BOOLEAN_UNEXPECTED_VALUE',
    message: `Unexpected value for ${fieldName}; please review.`,
    originalValue: value,
    cleanedValue: null,
    requiresReview: true,
  });

  return null;
}

function normalizeIndoorOutdoor(rawValue, warnings) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const lowered = value.toLowerCase();
  if (lowered === 'indoor') return 'indoor';
  if (lowered === 'outdoor') return 'outdoor';
  if (lowered === 'indoor, outdoor' || lowered === 'outdoor, indoor' || lowered === 'both') {
    return 'both';
  }

  warnings.push({
    fieldName: 'Indoor or Outdoor',
    warningCode: 'INDOOR_OUTDOOR_UNEXPECTED',
    message: 'Indoor/Outdoor value is not recognized.',
    originalValue: value,
    cleanedValue: null,
    requiresReview: true,
  });

  return null;
}

function normalizePriceLevel(rawValue, warnings) {
  const value = cleanText(rawValue);
  if (!value) {
    return null;
  }

  const lowered = value.toLowerCase();
  if (lowered.includes('low') || lowered.includes('($)')) return 1;
  if (lowered.includes('medium') || lowered.includes('($$)')) return 2;
  if (lowered.includes('high') || lowered.includes('($$$)')) return 3;
  if (lowered.includes('($$$$)')) return 4;

  warnings.push({
    fieldName: 'Price Range',
    warningCode: 'PRICE_UNEXPECTED_VALUE',
    message: 'Price range value is not recognized.',
    originalValue: value,
    cleanedValue: null,
    requiresReview: true,
  });

  return null;
}

async function getIdByName(client, cache, tableName, value) {
  if (!value) return null;

  const key = value.toLowerCase();
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await client.query(
    `INSERT INTO ${tableName} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [value],
  );

  const id = result.rows[0].id;
  cache.set(key, id);
  return id;
}

async function getActivityTypeId(client, cache, warnings, label) {
  if (!label) return null;

  const key = label.toLowerCase();
  if (cache.has(key)) {
    return cache.get(key);
  }

  const code = slugify(label);
  const result = await client.query(
    `INSERT INTO activity_types (code, label)
     VALUES ($1, $2)
     ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, is_active = TRUE, updated_at = NOW()
     RETURNING id`,
    [code, label],
  );

  const id = result.rows[0].id;
  cache.set(key, id);

  warnings.push({
    fieldName: 'Activity Type',
    warningCode: 'ACTIVITY_TYPE_AUTO_CREATED',
    message: `A new activity type was auto-created during import: ${label}`,
    originalValue: label,
    cleanedValue: label,
    requiresReview: false,
  });

  return id;
}

async function loadAgeGroupMap(client) {
  const result = await client.query('SELECT id, label FROM age_groups WHERE is_active = TRUE');
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.label.toLowerCase(), row.id);
  }
  return map;
}

async function loadActivityTypeMap(client) {
  const result = await client.query('SELECT id, label FROM activity_types WHERE is_active = TRUE');
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.label.toLowerCase(), row.id);
  }
  return map;
}

async function loadLocationTypeMap(client) {
  const result = await client.query('SELECT id, name FROM location_types');
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.name.toLowerCase(), row.id);
  }
  return map;
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
  const content = await fs.readFile(resolvedFile);
  const sourceSha256 = crypto.createHash('sha256').update(content).digest('hex');

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const summary = {
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    warnings: 0,
    reviewWarnings: 0,
    errors: 0,
    warningCodes: new Map(),
  };

  try {
    await client.query('BEGIN');

    const cityResult = await client.query('SELECT id FROM cities WHERE code = $1', [args.cityCode]);
    if (cityResult.rowCount === 0) {
      throw new Error(`City code not found: ${args.cityCode}. Seed it first in cities table.`);
    }

    const cityId = cityResult.rows[0].id;

    const batchResult = await client.query(
      `INSERT INTO import_batches (
        city_id,
        source_filename,
        source_sha256,
        status,
        total_rows,
        created_by
      ) VALUES ($1, $2, $3, 'running', $4, $5)
      RETURNING id`,
      [cityId, path.basename(resolvedFile), sourceSha256, rows.length, args.createdBy],
    );

    const batchId = batchResult.rows[0].id;

    const ageGroupMap = await loadAgeGroupMap(client);
    const activityTypeMap = await loadActivityTypeMap(client);
    const locationTypeMap = await loadLocationTypeMap(client);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      await client.query('SAVEPOINT row_import');

      try {
        const warnings = [];
        const cleanedFields = {};

        const externalId = cleanText(row['Activity ID'])?.toUpperCase() ?? null;
        if (!externalId) {
          throw new Error('Activity ID is required.');
        }

        if (!/^[A-Z]{2}[0-9]{5}$/.test(externalId)) {
          warnings.push({
            fieldName: 'Activity ID',
            warningCode: 'ACTIVITY_ID_NON_STANDARD',
            message: 'Activity ID does not match the legacy HT00001-style format.',
            originalValue: externalId,
            cleanedValue: externalId,
            requiresReview: false,
          });
        }

        const name = cleanText(row['Activity Name']);
        if (!name) {
          throw new Error('Activity Name is required.');
        }

        const description = cleanText(row.Description);
        const websiteUrl = normalizeWebsite(row.Website, warnings);
        const folderLocation = cleanText(row['Folder Location']);
        const hoursRaw = cleanMultiline(row.Hours);
        const email = normalizeEmail(row.Email, warnings);
        const { phoneRaw, phoneNormalized } = normalizePhone(row['Phone Number'], warnings);

        const locationTypeName = cleanText(row['Location Type']);
        const locationTypeId = await getIdByName(client, locationTypeMap, 'location_types', locationTypeName);

        const indoorOutdoor = normalizeIndoorOutdoor(row['Indoor or Outdoor'], warnings);
        const goodForParties = normalizeYesNo(row['Good for Parties/Events'], 'Good for Parties/Events', warnings);
        const seasonal = normalizeYesNo(row.Seasonal, 'Seasonal', warnings);
        const petFriendly = normalizeYesNo(row['Pet Friendly'], 'Pet Friendly', warnings);
        const priceLevel = normalizePriceLevel(row['Price Range'], warnings);
        const parkingAvailable = normalizeYesNo(row['Parking Available'], 'Parking Available', warnings);

        const rawLocations = [row['Location 1'], row['Location 2'], row['Location 3']]
          .map((value) => cleanMultiline(value))
          .filter(Boolean);

        if (rawLocations.length === 0) {
          warnings.push({
            fieldName: 'Location 1',
            warningCode: 'LOCATION_MISSING',
            message: 'No location was provided for this activity.',
            originalValue: null,
            cleanedValue: null,
            requiresReview: true,
          });
        }

        if (rawLocations.length > 1) {
          warnings.push({
            fieldName: 'Location 2/3',
            warningCode: 'MULTI_LOCATION_IN_SINGLE_ACTIVITY',
            message: 'Multiple locations found in one row. Current product model expects one activity per location.',
            originalValue: rawLocations.join(' | '),
            cleanedValue: null,
            requiresReview: true,
          });
        }

        const ageGroupTokens = splitMultiValue(row['Age Group']);
        const ageGroupIds = [];

        for (const token of ageGroupTokens) {
          const ageGroupId = ageGroupMap.get(token.toLowerCase());
          if (!ageGroupId) {
            warnings.push({
              fieldName: 'Age Group',
              warningCode: 'AGE_GROUP_UNKNOWN',
              message: `Age group value is not in configured taxonomy: ${token}`,
              originalValue: token,
              cleanedValue: null,
              requiresReview: true,
            });
            continue;
          }
          ageGroupIds.push(ageGroupId);
        }

        const activityTypeTokens = splitMultiValue(row['Activity Type']);
        const activityTypeIds = [];
        for (const token of activityTypeTokens) {
          const existing = activityTypeMap.get(token.toLowerCase());
          if (existing) {
            activityTypeIds.push(existing);
            continue;
          }

          const created = await getActivityTypeId(client, activityTypeMap, warnings, token);
          activityTypeIds.push(created);
        }

        cleanedFields.websiteUrl = websiteUrl;
        cleanedFields.email = email;
        cleanedFields.phoneRaw = phoneRaw;
        cleanedFields.phoneNormalized = phoneNormalized;
        cleanedFields.priceLevel = priceLevel;
        cleanedFields.indoorOutdoor = indoorOutdoor;

        const upsertResult = await client.query(
          `INSERT INTO activities (
            external_id,
            city_id,
            name,
            description,
            website_url,
            folder_location,
            hours_raw,
            email,
            phone_raw,
            phone_normalized,
            location_type_id,
            indoor_outdoor,
            good_for_parties,
            seasonal,
            pet_friendly,
            price_level,
            parking_available,
            source_last_import_batch_id,
            status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, 'active'
          )
          ON CONFLICT (external_id) DO UPDATE
          SET
            city_id = EXCLUDED.city_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            website_url = EXCLUDED.website_url,
            folder_location = EXCLUDED.folder_location,
            hours_raw = EXCLUDED.hours_raw,
            email = EXCLUDED.email,
            phone_raw = EXCLUDED.phone_raw,
            phone_normalized = EXCLUDED.phone_normalized,
            location_type_id = EXCLUDED.location_type_id,
            indoor_outdoor = EXCLUDED.indoor_outdoor,
            good_for_parties = EXCLUDED.good_for_parties,
            seasonal = EXCLUDED.seasonal,
            pet_friendly = EXCLUDED.pet_friendly,
            price_level = EXCLUDED.price_level,
            parking_available = EXCLUDED.parking_available,
            source_last_import_batch_id = EXCLUDED.source_last_import_batch_id,
            status = 'active',
            updated_at = NOW()
          RETURNING id, (xmax = 0) AS inserted`,
          [
            externalId,
            cityId,
            name,
            description,
            websiteUrl,
            folderLocation,
            hoursRaw,
            email,
            phoneRaw,
            phoneNormalized,
            locationTypeId,
            indoorOutdoor,
            goodForParties,
            seasonal,
            petFriendly,
            priceLevel,
            parkingAvailable,
            batchId,
          ],
        );

        const activityId = upsertResult.rows[0].id;
        const inserted = upsertResult.rows[0].inserted === true;

        if (inserted) {
          summary.inserted += 1;
        } else {
          summary.updated += 1;
        }

        await client.query('DELETE FROM activity_locations WHERE activity_id = $1', [activityId]);

        for (let i = 0; i < rawLocations.length; i += 1) {
          const locationValue = rawLocations[i];
          await client.query(
            `INSERT INTO activity_locations (activity_id, sort_order, address_raw, is_primary)
             VALUES ($1, $2, $3, $4)`,
            [activityId, i + 1, locationValue, i === 0],
          );
        }

        await client.query('DELETE FROM activity_age_groups WHERE activity_id = $1', [activityId]);
        for (const ageGroupId of [...new Set(ageGroupIds)]) {
          await client.query(
            'INSERT INTO activity_age_groups (activity_id, age_group_id) VALUES ($1, $2)',
            [activityId, ageGroupId],
          );
        }

        await client.query('DELETE FROM activity_activity_types WHERE activity_id = $1', [activityId]);
        for (const activityTypeId of [...new Set(activityTypeIds)]) {
          await client.query(
            'INSERT INTO activity_activity_types (activity_id, activity_type_id) VALUES ($1, $2)',
            [activityId, activityTypeId],
          );
        }

        // Ensure exactly five ranked image placeholders exist for downstream media pipeline.
        for (let rank = 1; rank <= 5; rank += 1) {
          await client.query(
            `INSERT INTO activity_images (activity_id, rank_order, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (activity_id, rank_order) DO NOTHING`,
            [activityId, rank],
          );
        }

        const rowResult = await client.query(
          `INSERT INTO import_row_results (
            batch_id,
            row_number,
            external_id,
            activity_id,
            action,
            warning_count,
            cleaned_fields
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
          [
            batchId,
            rowNumber,
            externalId,
            activityId,
            inserted ? 'inserted' : 'updated',
            warnings.length,
            JSON.stringify(cleanedFields),
          ],
        );

        const rowResultId = rowResult.rows[0].id;

        for (const warning of warnings) {
          await client.query(
            `INSERT INTO import_warnings (
              batch_id,
              row_result_id,
              activity_id,
              external_id,
              field_name,
              warning_code,
              message,
              original_value,
              cleaned_value,
              requires_review
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              batchId,
              rowResultId,
              activityId,
              externalId,
              warning.fieldName,
              warning.warningCode,
              warning.message,
              warning.originalValue,
              warning.cleanedValue,
              warning.requiresReview,
            ],
          );

          const existingCount = summary.warningCodes.get(warning.warningCode) ?? 0;
          summary.warningCodes.set(warning.warningCode, existingCount + 1);

          if (warning.requiresReview) {
            summary.reviewWarnings += 1;

            await client.query(
              `INSERT INTO activity_data_issues (
                activity_id,
                field_name,
                issue_code,
                issue_message,
                latest_batch_id,
                status
              ) VALUES ($1, $2, $3, $4, $5, 'open')
              ON CONFLICT (activity_id, field_name, issue_code)
              WHERE status = 'open'
              DO UPDATE SET
                issue_message = EXCLUDED.issue_message,
                latest_batch_id = EXCLUDED.latest_batch_id,
                last_detected_at = NOW()`,
              [
                activityId,
                warning.fieldName,
                warning.warningCode,
                warning.message,
                batchId,
              ],
            );
          }
        }

        summary.warnings += warnings.length;

        await client.query('RELEASE SAVEPOINT row_import');
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT row_import');
        await client.query('RELEASE SAVEPOINT row_import');

        summary.errors += 1;

        const externalId = cleanText(row['Activity ID'])?.toUpperCase() ?? null;
        const errMsg = error instanceof Error ? error.message : String(error);

        await client.query(
          `INSERT INTO import_row_results (
            batch_id,
            row_number,
            external_id,
            action,
            warning_count,
            error_message,
            cleaned_fields
          ) VALUES ($1, $2, $3, 'error', 0, $4, '{}'::jsonb)`,
          [batchId, rowNumber, externalId, errMsg],
        );
      }
    }

    await client.query(
      `UPDATE import_batches
       SET
         completed_at = clock_timestamp(),
         status = $2,
         inserted_count = $3,
         updated_count = $4,
         skipped_count = $5,
         warning_count = $6,
         error_count = $7,
         notes = $8
       WHERE id = $1`,
      [
        batchId,
        summary.errors > 0 ? 'completed_with_errors' : 'completed',
        summary.inserted,
        summary.updated,
        summary.skipped,
        summary.warnings,
        summary.errors,
        args.dryRun ? 'Dry run - rolled back' : null,
      ],
    );

    if (args.dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    console.log('Import summary');
    console.log(`- File: ${resolvedFile}`);
    console.log(`- City: ${args.cityCode}`);
    console.log(`- Rows processed: ${summary.totalRows}`);
    console.log(`- Inserted: ${summary.inserted}`);
    console.log(`- Updated: ${summary.updated}`);
    console.log(`- Skipped: ${summary.skipped}`);
    console.log(`- Warnings: ${summary.warnings}`);
    console.log(`- Review warnings: ${summary.reviewWarnings}`);
    console.log(`- Errors: ${summary.errors}`);
    console.log(`- Mode: ${args.dryRun ? 'DRY RUN (rolled back)' : 'COMMIT'}\n`);

    if (summary.warningCodes.size > 0) {
      console.log('Warning breakdown:');
      const sorted = [...summary.warningCodes.entries()].sort((a, b) => b[1] - a[1]);
      for (const [code, count] of sorted) {
        console.log(`- ${code}: ${count}`);
      }
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
  console.error('Import failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
