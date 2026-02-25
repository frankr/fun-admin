import { IncomingMessage, ServerResponse } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { Pool } from 'pg'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_DATABASE_URL = 'postgres://fun_admin:fun_admin@localhost:54329/fun_admin'
const MIN_RECOMMENDED_IMAGES = 3
const AUTH_COOKIE_NAME = 'admin_auth'
const AUTH_LOGIN_PATH = '/_auth/login'
const AUTH_LOGIN_POST_PATH = '/_auth/api/login'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
})

type DashboardResponse = {
  totalActivities: number
  newThisWeek: number
  liveLocations: number
  openIssues: number
  readyForLive: number
}

type ActivityListItem = {
  externalId: string
  name: string
  location: string | null
  websiteUrl: string | null
  heroImageUrl: string | null
  category: string
  status: 'active' | 'inactive'
  approvedImageCount: number
  hasFullImageSet: boolean
  readyForLive: boolean
  openIssueCount: number
  hasLocationQualityIssue: boolean
  belowRecommendedImages: boolean
  needsAttention: boolean
}

type ActivitiesResponse = {
  page: number
  pageSize: number
  total: number
  items: ActivityListItem[]
}

type ActivityDetailImage = {
  rankOrder: number
  status: 'pending' | 'ready' | 'rejected'
  publicUrl: string | null
  sourceFilename: string | null
  reviewClassification: string | null
  altText: string | null
  approvedAt: string | null
}

type ActivityDetailIssue = {
  fieldName: string
  issueCode: string
  issueMessage: string
}

type ActivityDetailResponse = {
  externalId: string
  name: string
  description: string | null
  websiteUrl: string | null
  status: 'active' | 'inactive'
  hoursRaw: string | null
  email: string | null
  phoneRaw: string | null
  phoneNormalized: string | null
  locationType: string | null
  primaryLocation: string | null
  indoorOutdoor: 'indoor' | 'outdoor' | 'both' | null
  goodForParties: boolean | null
  seasonal: boolean | null
  petFriendly: boolean | null
  parkingAvailable: boolean | null
  priceLevel: number | null
  approvedImageCount: number
  hasFullImageSet: boolean
  readyForLive: boolean
  ageGroups: string[]
  activityTypes: string[]
  images: ActivityDetailImage[]
  openIssues: ActivityDetailIssue[]
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function parseCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null
  }

  const items = cookieHeader.split(';')
  for (const item of items) {
    const [rawKey, ...rest] = item.trim().split('=')
    if (rawKey !== name) {
      continue
    }
    return decodeURIComponent(rest.join('='))
  }

  return null
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 16_384) {
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function expectedAuthToken(password: string): string {
  return createHmac('sha256', password).update('authenticated').digest('hex')
}

function isAuthorized(token: string | null, expectedToken: string): boolean {
  if (!token) {
    return false
  }

  const providedBuffer = Buffer.from(token, 'utf8')
  const expectedBuffer = Buffer.from(expectedToken, 'utf8')
  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function loginHtml(errorMessage: string | null): string {
  const errorBlock = errorMessage
    ? `<p style="margin:0 0 16px;color:#fca5a5;font:600 14px/1.4 system-ui,sans-serif;">${errorMessage}</p>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Funzilla Admin Login</title>
  </head>
  <body style="margin:0;min-height:100vh;background:#020617;color:#e2e8f0;display:flex;align-items:center;justify-content:center;padding:24px;">
    <main style="width:100%;max-width:420px;border:1px solid #334155;border-radius:20px;background:#0f172a;padding:24px;">
      <h1 style="margin:0 0 8px;font:800 28px/1.2 system-ui,sans-serif;color:#f8fafc;">Funzilla Admin</h1>
      <p style="margin:0 0 18px;color:#94a3b8;font:500 14px/1.5 system-ui,sans-serif;">Enter password to continue.</p>
      ${errorBlock}
      <form method="post" action="${AUTH_LOGIN_POST_PATH}">
        <input name="next" type="hidden" value="__NEXT__" />
        <label style="display:block;margin-bottom:8px;font:600 14px/1.4 system-ui,sans-serif;">Password</label>
        <input name="password" type="password" required style="box-sizing:border-box;width:100%;border:1px solid #475569;border-radius:12px;background:#020617;color:#f8fafc;padding:12px 14px;margin:0 0 14px;font:500 14px/1.2 system-ui,sans-serif;" />
        <button type="submit" style="width:100%;border:0;border-radius:12px;padding:12px 14px;background:#0ea5e9;color:#fff;font:700 14px/1.2 system-ui,sans-serif;cursor:pointer;">Log in</button>
      </form>
    </main>
  </body>
</html>`
}

function attachAuthMiddleware(server: {
  middlewares: {
    use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void
  }
}): void {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const password = process.env.ADMIN_PASSWORD ?? process.env.REVIEW_PASSWORD
      if (!password) {
        next()
        return
      }

      const parsed = new URL(req.url ?? '/', 'http://localhost')
      const requestPath = parsed.pathname
      const expectedToken = expectedAuthToken(password)

      // Keep admin UI protected, but allow public API access for mobile clients.
      if (requestPath === '/api' || requestPath.startsWith('/api/')) {
        next()
        return
      }

      if (requestPath === AUTH_LOGIN_PATH && req.method === 'GET') {
        const requestedNext = parsed.searchParams.get('next') ?? '/'
        const safeNext = requestedNext.startsWith('/') ? requestedNext : '/'
        const errorMessage = parsed.searchParams.get('error') === '1' ? 'Wrong password' : null

        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(loginHtml(errorMessage).replace('__NEXT__', safeNext))
        return
      }

      if (requestPath === AUTH_LOGIN_POST_PATH && req.method === 'POST') {
        try {
          const body = await readRequestBody(req)
          const form = new URLSearchParams(body)
          const submittedPassword = form.get('password') ?? ''
          const requestedNext = form.get('next') ?? '/'
          const safeNext = requestedNext.startsWith('/') ? requestedNext : '/'

          if (submittedPassword !== password) {
            res.statusCode = 302
            res.setHeader('Location', `${AUTH_LOGIN_PATH}?error=1&next=${encodeURIComponent(safeNext)}`)
            res.end()
            return
          }

          res.statusCode = 302
          res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=${expectedToken}; Path=/; HttpOnly; SameSite=Lax`)
          res.setHeader('Location', safeNext)
          res.end()
          return
        } catch {
          res.statusCode = 400
          res.end('Invalid request')
          return
        }
      }

      if (requestPath === AUTH_LOGIN_PATH || requestPath === AUTH_LOGIN_POST_PATH) {
        res.statusCode = 405
        res.end('Method not allowed')
        return
      }

      const providedToken = parseCookieValue(req.headers.cookie, AUTH_COOKIE_NAME)
      if (isAuthorized(providedToken, expectedToken)) {
        next()
        return
      }

      if (req.method === 'GET' || req.method === 'HEAD') {
        const nextPath = `${requestPath}${parsed.search}`
        res.statusCode = 302
        res.setHeader('Location', `${AUTH_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`)
        res.end()
        return
      }

      sendJson(res, 401, { message: 'Unauthorized' })
    })
}

async function getDashboard(cityCode: string): Promise<DashboardResponse | null> {
  const query = `
    SELECT
      COUNT(*)::int AS total_activities,
      COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days')::int AS new_this_week,
      COALESCE(loc.live_location_count, 0)::int AS live_locations,
      COALESCE(issues.open_issues, 0)::int AS open_issues,
      COALESCE(readiness.ready_count, 0)::int AS ready_for_live
    FROM activities a
    JOIN cities c ON c.id = a.city_id
    LEFT JOIN (
      SELECT a2.city_id, COUNT(*)::int AS live_location_count
      FROM activity_locations al
      JOIN activities a2 ON a2.id = al.activity_id
      JOIN v_activity_readiness vr2 ON vr2.activity_id = a2.id
      WHERE al.is_primary = TRUE
        AND vr2.ready_for_live = TRUE
      GROUP BY a2.city_id
    ) loc ON loc.city_id = a.city_id
    LEFT JOIN (
      SELECT a3.city_id, COUNT(*)::int AS open_issues
      FROM activity_data_issues adi
      JOIN activities a3 ON a3.id = adi.activity_id
      WHERE adi.status = 'open'
      GROUP BY a3.city_id
    ) issues ON issues.city_id = a.city_id
    LEFT JOIN (
      SELECT a4.city_id, COUNT(*)::int AS ready_count
      FROM v_activity_readiness vr
      JOIN activities a4 ON a4.id = vr.activity_id
      WHERE vr.ready_for_live = TRUE
      GROUP BY a4.city_id
    ) readiness ON readiness.city_id = a.city_id
    WHERE c.code = $1
      AND a.status = 'active'
    GROUP BY loc.live_location_count, issues.open_issues, readiness.ready_count
  `

  const result = await pool.query<{
    total_activities: number
    new_this_week: number
    live_locations: number
    open_issues: number
    ready_for_live: number
  }>(query, [cityCode])

  if (result.rowCount === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    totalActivities: row.total_activities,
    newThisWeek: row.new_this_week,
    liveLocations: row.live_locations,
    openIssues: row.open_issues,
    readyForLive: row.ready_for_live,
  }
}

async function getActivities(
  cityCode: string,
  search: string,
  statusFilter: 'all' | 'ready' | 'needs_review' | 'attention',
  page: number,
  pageSize: number,
): Promise<ActivitiesResponse> {
  const normalizedSearch = search.trim()
  const searchPattern = normalizedSearch.length > 0 ? `%${normalizedSearch}%` : null
  const offset = (page - 1) * pageSize

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM activities a
    JOIN cities c ON c.id = a.city_id
    LEFT JOIN v_activity_readiness vr ON vr.activity_id = a.id
    LEFT JOIN LATERAL (
      SELECT al.address_raw
      FROM activity_locations al
      WHERE al.activity_id = a.id
      ORDER BY al.is_primary DESC, al.sort_order ASC
      LIMIT 1
    ) loc ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS open_issue_count
      FROM activity_data_issues adi
      WHERE adi.activity_id = a.id
        AND adi.status = 'open'
    ) issue ON TRUE
    WHERE c.code = $1
      AND a.status = 'active'
      AND (
        $2::text IS NULL
        OR a.name ILIKE $2
        OR COALESCE(loc.address_raw, '') ILIKE $2
      )
      AND (
        $3::text = 'all'
        OR ($3::text = 'ready' AND COALESCE(vr.ready_for_live, FALSE) = TRUE)
        OR ($3::text = 'needs_review' AND COALESCE(vr.ready_for_live, FALSE) = FALSE)
        OR (
          $3::text = 'attention'
          AND (
            COALESCE(issue.open_issue_count, 0) > 0
            OR (
              COALESCE(vr.ready_for_live, FALSE) = TRUE
              AND (
                COALESCE(vr.approved_image_count, 0) < ${MIN_RECOMMENDED_IMAGES}
                OR (
                  loc.address_raw IS NULL
                  OR btrim(loc.address_raw) = ''
                  OR loc.address_raw !~* '[0-9]{5}(-[0-9]{4})?'
                  OR loc.address_raw NOT LIKE '%,%'
                )
              )
            )
          )
        )
      )
  `

  const countResult = await pool.query<{ total: number }>(countSql, [
    cityCode,
    searchPattern,
    statusFilter,
  ])
  const total = countResult.rows[0]?.total ?? 0

  const listSql = `
    SELECT
      a.external_id,
      a.name,
      NULLIF(SPLIT_PART(COALESCE(loc.address_raw, ''), E'\\n', 1), '') AS location,
      a.website_url,
      img.public_url AS hero_image_url,
      COALESCE(cat.label, 'Uncategorized') AS category,
      a.status,
      COALESCE(vr.approved_image_count, 0)::int AS approved_image_count,
      COALESCE(vr.has_full_image_set, FALSE) AS has_full_image_set,
      COALESCE(vr.ready_for_live, FALSE) AS ready_for_live,
      COALESCE(issue.open_issue_count, 0)::int AS open_issue_count,
      (
        loc.address_raw IS NULL
        OR btrim(loc.address_raw) = ''
        OR loc.address_raw !~* '[0-9]{5}(-[0-9]{4})?'
        OR loc.address_raw NOT LIKE '%,%'
      ) AS has_location_quality_issue
    FROM activities a
    JOIN cities c ON c.id = a.city_id
    LEFT JOIN LATERAL (
      SELECT al.address_raw
      FROM activity_locations al
      WHERE al.activity_id = a.id
      ORDER BY al.is_primary DESC, al.sort_order ASC
      LIMIT 1
    ) loc ON TRUE
    LEFT JOIN LATERAL (
      SELECT at.label
      FROM activity_activity_types aat
      JOIN activity_types at ON at.id = aat.activity_type_id
      WHERE aat.activity_id = a.id
      ORDER BY at.label ASC
      LIMIT 1
    ) cat ON TRUE
    LEFT JOIN LATERAL (
      SELECT ai.public_url
      FROM activity_images ai
      WHERE ai.activity_id = a.id
        AND ai.status = 'ready'
        AND ai.public_url IS NOT NULL
      ORDER BY ai.rank_order ASC
      LIMIT 1
    ) img ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS open_issue_count
      FROM activity_data_issues adi
      WHERE adi.activity_id = a.id
        AND adi.status = 'open'
    ) issue ON TRUE
    LEFT JOIN v_activity_readiness vr ON vr.activity_id = a.id
    WHERE c.code = $1
      AND a.status = 'active'
      AND (
        $2::text IS NULL
        OR a.name ILIKE $2
        OR COALESCE(loc.address_raw, '') ILIKE $2
      )
      AND (
        $3::text = 'all'
        OR ($3::text = 'ready' AND COALESCE(vr.ready_for_live, FALSE) = TRUE)
        OR ($3::text = 'needs_review' AND COALESCE(vr.ready_for_live, FALSE) = FALSE)
        OR (
          $3::text = 'attention'
          AND (
            COALESCE(issue.open_issue_count, 0) > 0
            OR (
              COALESCE(vr.ready_for_live, FALSE) = TRUE
              AND (
                COALESCE(vr.approved_image_count, 0) < ${MIN_RECOMMENDED_IMAGES}
                OR (
                  loc.address_raw IS NULL
                  OR btrim(loc.address_raw) = ''
                  OR loc.address_raw !~* '[0-9]{5}(-[0-9]{4})?'
                  OR loc.address_raw NOT LIKE '%,%'
                )
              )
            )
          )
        )
      )
    ORDER BY a.name ASC
    LIMIT $4 OFFSET $5
  `

  const listResult = await pool.query<{
    external_id: string
    name: string
    location: string | null
    website_url: string | null
    hero_image_url: string | null
    category: string
    status: 'active' | 'inactive'
    approved_image_count: number
    has_full_image_set: boolean
    ready_for_live: boolean
    open_issue_count: number
    has_location_quality_issue: boolean
  }>(listSql, [cityCode, searchPattern, statusFilter, pageSize, offset])

  return {
    page,
    pageSize,
    total,
    items: listResult.rows.map((row) => ({
      externalId: row.external_id,
      name: row.name,
      location: row.location,
      websiteUrl: row.website_url,
      heroImageUrl: row.hero_image_url,
      category: row.category,
      status: row.status,
      approvedImageCount: row.approved_image_count,
      hasFullImageSet: row.has_full_image_set,
      readyForLive: row.ready_for_live,
      openIssueCount: row.open_issue_count,
      hasLocationQualityIssue: row.has_location_quality_issue,
      belowRecommendedImages: row.approved_image_count < MIN_RECOMMENDED_IMAGES,
      needsAttention:
        row.open_issue_count > 0 ||
        (row.ready_for_live &&
          (row.approved_image_count < MIN_RECOMMENDED_IMAGES || row.has_location_quality_issue)),
    })),
  }
}

async function getActivityDetail(
  cityCode: string,
  externalId: string,
): Promise<ActivityDetailResponse | null> {
  const detailSql = `
    SELECT
      a.id,
      a.external_id,
      a.name,
      a.description,
      a.website_url,
      a.status,
      a.hours_raw,
      a.email,
      a.phone_raw,
      a.phone_normalized,
      a.indoor_outdoor,
      a.good_for_parties,
      a.seasonal,
      a.pet_friendly,
      a.parking_available,
      a.price_level,
      lt.name AS location_type,
      loc.address_raw AS primary_location,
      COALESCE(vr.approved_image_count, 0)::int AS approved_image_count,
      COALESCE(vr.has_full_image_set, FALSE) AS has_full_image_set,
      COALESCE(vr.ready_for_live, FALSE) AS ready_for_live
    FROM activities a
    JOIN cities c ON c.id = a.city_id
    LEFT JOIN location_types lt ON lt.id = a.location_type_id
    LEFT JOIN LATERAL (
      SELECT al.address_raw
      FROM activity_locations al
      WHERE al.activity_id = a.id
      ORDER BY al.is_primary DESC, al.sort_order ASC
      LIMIT 1
    ) loc ON TRUE
    LEFT JOIN v_activity_readiness vr ON vr.activity_id = a.id
    WHERE c.code = $1
      AND a.external_id = $2
    LIMIT 1
  `

  const detailResult = await pool.query<{
    id: string
    external_id: string
    name: string
    description: string | null
    website_url: string | null
    status: 'active' | 'inactive'
    hours_raw: string | null
    email: string | null
    phone_raw: string | null
    phone_normalized: string | null
    indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null
    good_for_parties: boolean | null
    seasonal: boolean | null
    pet_friendly: boolean | null
    parking_available: boolean | null
    price_level: number | null
    location_type: string | null
    primary_location: string | null
    approved_image_count: number
    has_full_image_set: boolean
    ready_for_live: boolean
  }>(detailSql, [cityCode, externalId])

  if (detailResult.rowCount === 0) {
    return null
  }

  const activityRow = detailResult.rows[0]

  const [ageGroupResult, activityTypeResult, imageResult, issueResult] = await Promise.all([
    pool.query<{ label: string }>(
      `SELECT ag.label
       FROM activity_age_groups aag
       JOIN age_groups ag ON ag.id = aag.age_group_id
       WHERE aag.activity_id = $1
       ORDER BY ag.sort_order ASC`,
      [activityRow.id],
    ),
    pool.query<{ label: string }>(
      `SELECT at.label
       FROM activity_activity_types aat
       JOIN activity_types at ON at.id = aat.activity_type_id
       WHERE aat.activity_id = $1
       ORDER BY at.label ASC`,
      [activityRow.id],
    ),
    pool.query<{
      rank_order: number
      status: 'pending' | 'ready' | 'rejected'
      public_url: string | null
      source_filename: string | null
      review_classification: string | null
      alt_text: string | null
      approved_at: string | null
    }>(
      `SELECT
         ai.rank_order,
         ai.status,
         ai.public_url,
         ai.source_filename,
         ai.review_classification,
         ai.alt_text,
         ai.approved_at
       FROM activity_images ai
       WHERE ai.activity_id = $1
       ORDER BY ai.rank_order ASC`,
      [activityRow.id],
    ),
    pool.query<{
      field_name: string
      issue_code: string
      issue_message: string
    }>(
      `SELECT field_name, issue_code, issue_message
       FROM activity_data_issues
       WHERE activity_id = $1
         AND status = 'open'
       ORDER BY field_name ASC, issue_code ASC`,
      [activityRow.id],
    ),
  ])

  return {
    externalId: activityRow.external_id,
    name: activityRow.name,
    description: activityRow.description,
    websiteUrl: activityRow.website_url,
    status: activityRow.status,
    hoursRaw: activityRow.hours_raw,
    email: activityRow.email,
    phoneRaw: activityRow.phone_raw,
    phoneNormalized: activityRow.phone_normalized,
    locationType: activityRow.location_type,
    primaryLocation: activityRow.primary_location,
    indoorOutdoor: activityRow.indoor_outdoor,
    goodForParties: activityRow.good_for_parties,
    seasonal: activityRow.seasonal,
    petFriendly: activityRow.pet_friendly,
    parkingAvailable: activityRow.parking_available,
    priceLevel: activityRow.price_level,
    approvedImageCount: activityRow.approved_image_count,
    hasFullImageSet: activityRow.has_full_image_set,
    readyForLive: activityRow.ready_for_live,
    ageGroups: ageGroupResult.rows.map((row) => row.label),
    activityTypes: activityTypeResult.rows.map((row) => row.label),
    images: imageResult.rows.map((row) => ({
      rankOrder: row.rank_order,
      status: row.status,
      publicUrl: row.public_url,
      sourceFilename: row.source_filename,
      reviewClassification: row.review_classification,
      altText: row.alt_text,
      approvedAt: row.approved_at,
    })),
    openIssues: issueResult.rows.map((row) => ({
      fieldName: row.field_name,
      issueCode: row.issue_code,
      issueMessage: row.issue_message,
    })),
  }
}

function createDevApiPlugin(): Plugin {
  const attachApiMiddleware = (
    server: {
      middlewares: {
        use: (
          path: string,
          handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void,
        ) => void
      }
    },
  ): void => {
    server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next) => {
      if (req.method !== 'GET') {
        next()
        return
      }

      const parsed = new URL(req.url ?? '/', 'http://localhost')
      const cityCode = (parsed.searchParams.get('city') ?? 'HOU').toUpperCase()

      try {
        if (parsed.pathname === '/dashboard') {
          const dashboard = await getDashboard(cityCode)

          if (!dashboard) {
            sendJson(res, 404, {
              message: `City ${cityCode} not found or has no active activities.`,
            })
            return
          }

          sendJson(res, 200, dashboard)
          return
        }

        if (parsed.pathname === '/activities') {
          const page = Number(parsed.searchParams.get('page') ?? '1')
          const pageSize = Number(parsed.searchParams.get('pageSize') ?? '25')
          const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
          const safePageSize =
            Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 100
              ? Math.floor(pageSize)
              : 25

          const search = parsed.searchParams.get('search') ?? ''
          const rawFilter = parsed.searchParams.get('status') ?? 'all'
          const statusFilter =
            rawFilter === 'ready' || rawFilter === 'needs_review' || rawFilter === 'attention'
              ? rawFilter
              : 'all'

          const activities = await getActivities(
            cityCode,
            search,
            statusFilter,
            safePage,
            safePageSize,
          )
          sendJson(res, 200, activities)
          return
        }

        const pathParts = parsed.pathname.split('/').filter(Boolean)
        if (pathParts[0] === 'activities' && pathParts.length === 2) {
          const externalId = decodeURIComponent(pathParts[1]).toUpperCase()
          const activity = await getActivityDetail(cityCode, externalId)

          if (!activity) {
            sendJson(res, 404, {
              message: `Activity ${externalId} was not found in city ${cityCode}.`,
            })
            return
          }

          sendJson(res, 200, activity)
          return
        }

        next()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown API error'
        sendJson(res, 500, { message })
      }
    })
  }

  return {
    name: 'fun-admin-dev-api',
    configureServer(server) {
      attachAuthMiddleware(server)
      attachApiMiddleware(server)
    },
    configurePreviewServer(server) {
      attachAuthMiddleware(server)
      attachApiMiddleware(server)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), createDevApiPlugin()],
})
