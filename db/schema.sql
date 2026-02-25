BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE TYPE activity_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE indoor_outdoor_type AS ENUM ('indoor', 'outdoor', 'both');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE image_status AS ENUM ('pending', 'ready', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE import_status AS ENUM ('running', 'completed', 'completed_with_errors', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE import_row_action AS ENUM ('inserted', 'updated', 'skipped', 'error');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE issue_status AS ENUM ('open', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  state_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'US',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (code = UPPER(code))
);

CREATE TABLE IF NOT EXISTS location_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS age_groups (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL UNIQUE,
  sort_order SMALLINT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_types (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id),
  source_filename TEXT NOT NULL,
  source_sha256 TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status import_status NOT NULL DEFAULT 'running',
  total_rows INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  city_id UUID NOT NULL REFERENCES cities(id),
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  folder_location TEXT,
  hours_raw TEXT,
  email CITEXT,
  phone_raw TEXT,
  phone_normalized TEXT,
  location_type_id BIGINT REFERENCES location_types(id),
  indoor_outdoor indoor_outdoor_type,
  activity_type_other_text TEXT,
  good_for_parties BOOLEAN,
  seasonal BOOLEAN,
  pet_friendly BOOLEAN,
  price_level SMALLINT,
  parking_available BOOLEAN,
  status activity_status NOT NULL DEFAULT 'active',
  source_last_import_batch_id UUID REFERENCES import_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (price_level IS NULL OR (price_level >= 1 AND price_level <= 4))
);

CREATE TABLE IF NOT EXISTS activity_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 1,
  address_raw TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, sort_order)
);

CREATE TABLE IF NOT EXISTS activity_age_groups (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  age_group_id SMALLINT NOT NULL REFERENCES age_groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, age_group_id)
);

CREATE TABLE IF NOT EXISTS activity_activity_types (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  activity_type_id SMALLINT NOT NULL REFERENCES activity_types(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, activity_type_id)
);

CREATE TABLE IF NOT EXISTS activity_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  rank_order SMALLINT NOT NULL,
  storage_provider TEXT,
  storage_key TEXT,
  public_url TEXT,
  width_px INTEGER,
  height_px INTEGER,
  alt_text TEXT,
  status image_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, rank_order),
  CHECK (rank_order >= 1 AND rank_order <= 5)
);

CREATE TABLE IF NOT EXISTS import_row_results (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  external_id TEXT,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  action import_row_action NOT NULL,
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  cleaned_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, row_number)
);

CREATE TABLE IF NOT EXISTS import_warnings (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_result_id BIGINT REFERENCES import_row_results(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  external_id TEXT,
  field_name TEXT NOT NULL,
  warning_code TEXT NOT NULL,
  message TEXT NOT NULL,
  original_value TEXT,
  cleaned_value TEXT,
  requires_review BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS activity_data_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  issue_code TEXT NOT NULL,
  issue_message TEXT NOT NULL,
  latest_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  status issue_status NOT NULL DEFAULT 'open',
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS activity_change_log (
  id BIGSERIAL PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB,
  CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_activity_locations_primary
  ON activity_locations(activity_id)
  WHERE is_primary = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_activity_data_issues_open
  ON activity_data_issues(activity_id, field_name, issue_code)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS ix_activities_city_status ON activities(city_id, status);
CREATE INDEX IF NOT EXISTS ix_activities_name ON activities(name);
CREATE INDEX IF NOT EXISTS ix_activities_external_id ON activities(external_id);
CREATE INDEX IF NOT EXISTS ix_import_warnings_activity ON import_warnings(activity_id);
CREATE INDEX IF NOT EXISTS ix_activity_data_issues_activity_status ON activity_data_issues(activity_id, status);
CREATE INDEX IF NOT EXISTS ix_activity_change_log_activity_changed_at ON activity_change_log(activity_id, changed_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_activity_change()
RETURNS TRIGGER AS $$
DECLARE
  actor TEXT;
  activity_id_column TEXT;
  target_activity_id UUID;
BEGIN
  actor := NULLIF(current_setting('app.current_user', true), '');
  activity_id_column := COALESCE(TG_ARGV[0], 'activity_id');

  IF TG_OP = 'DELETE' THEN
    target_activity_id := (to_jsonb(OLD)->>activity_id_column)::uuid;

    INSERT INTO activity_change_log (
      activity_id,
      table_name,
      operation,
      changed_by,
      old_data,
      new_data
    )
    VALUES (
      target_activity_id,
      TG_TABLE_NAME,
      TG_OP,
      actor,
      to_jsonb(OLD),
      NULL
    );

    RETURN OLD;
  END IF;

  target_activity_id := (to_jsonb(NEW)->>activity_id_column)::uuid;

  INSERT INTO activity_change_log (
    activity_id,
    table_name,
    operation,
    changed_by,
    old_data,
    new_data
  )
  VALUES (
    target_activity_id,
    TG_TABLE_NAME,
    TG_OP,
    actor,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cities_set_updated_at ON cities;
CREATE TRIGGER trg_cities_set_updated_at
BEFORE UPDATE ON cities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_age_groups_set_updated_at ON age_groups;
CREATE TRIGGER trg_age_groups_set_updated_at
BEFORE UPDATE ON age_groups
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_activity_types_set_updated_at ON activity_types;
CREATE TRIGGER trg_activity_types_set_updated_at
BEFORE UPDATE ON activity_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_activities_set_updated_at ON activities;
CREATE TRIGGER trg_activities_set_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_activity_locations_set_updated_at ON activity_locations;
CREATE TRIGGER trg_activity_locations_set_updated_at
BEFORE UPDATE ON activity_locations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_activity_images_set_updated_at ON activity_images;
CREATE TRIGGER trg_activity_images_set_updated_at
BEFORE UPDATE ON activity_images
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_activities_audit ON activities;
CREATE TRIGGER trg_activities_audit
AFTER INSERT OR UPDATE OR DELETE ON activities
FOR EACH ROW
EXECUTE FUNCTION log_activity_change('id');

DROP TRIGGER IF EXISTS trg_activity_locations_audit ON activity_locations;
CREATE TRIGGER trg_activity_locations_audit
AFTER INSERT OR UPDATE OR DELETE ON activity_locations
FOR EACH ROW
EXECUTE FUNCTION log_activity_change('activity_id');

DROP TRIGGER IF EXISTS trg_activity_age_groups_audit ON activity_age_groups;
CREATE TRIGGER trg_activity_age_groups_audit
AFTER INSERT OR UPDATE OR DELETE ON activity_age_groups
FOR EACH ROW
EXECUTE FUNCTION log_activity_change('activity_id');

DROP TRIGGER IF EXISTS trg_activity_activity_types_audit ON activity_activity_types;
CREATE TRIGGER trg_activity_activity_types_audit
AFTER INSERT OR UPDATE OR DELETE ON activity_activity_types
FOR EACH ROW
EXECUTE FUNCTION log_activity_change('activity_id');

DROP TRIGGER IF EXISTS trg_activity_images_audit ON activity_images;
CREATE TRIGGER trg_activity_images_audit
AFTER INSERT OR UPDATE OR DELETE ON activity_images
FOR EACH ROW
EXECUTE FUNCTION log_activity_change('activity_id');

INSERT INTO cities (code, name, state_code, country_code, timezone)
VALUES ('HOU', 'Houston', 'TX', 'US', 'America/Chicago')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  state_code = EXCLUDED.state_code,
  country_code = EXCLUDED.country_code,
  timezone = EXCLUDED.timezone,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO age_groups (code, label, sort_order)
VALUES
  ('infant', 'Infant', 1),
  ('toddler', 'Toddler', 2),
  ('kids_5_8', 'Kids 5-8', 3),
  ('tweens_9_12', 'Tweens (9-12)', 4),
  ('teens_13_17', 'Teens (13-17)', 5),
  ('all_ages', 'All Ages', 6)
ON CONFLICT (code) DO UPDATE
SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO activity_types (code, label)
VALUES
  ('sports', 'Sports'),
  ('art', 'Art'),
  ('nature', 'Nature'),
  ('science', 'Science'),
  ('food', 'Food'),
  ('theatre', 'Theatre'),
  ('music', 'Music')
ON CONFLICT (code) DO UPDATE
SET
  label = EXCLUDED.label,
  is_active = TRUE,
  updated_at = NOW();

CREATE OR REPLACE VIEW v_open_activity_issues AS
SELECT
  i.id,
  i.activity_id,
  a.external_id,
  a.name AS activity_name,
  c.code AS city_code,
  i.field_name,
  i.issue_code,
  i.issue_message,
  i.first_detected_at,
  i.last_detected_at,
  i.latest_batch_id
FROM activity_data_issues i
JOIN activities a ON a.id = i.activity_id
JOIN cities c ON c.id = a.city_id
WHERE i.status = 'open';

COMMIT;
