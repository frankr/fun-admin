import { IncomingMessage, ServerResponse } from 'node:http'
import { URL } from 'node:url'
import { Pool } from 'pg'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_DATABASE_URL = 'postgres://fun_admin:fun_admin@localhost:54329/fun_admin'

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
}

type ActivitiesResponse = {
  page: number
  pageSize: number
  total: number
  items: ActivityListItem[]
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
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
  statusFilter: 'all' | 'ready' | 'needs_review',
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
      COALESCE(vr.ready_for_live, FALSE) AS ready_for_live
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
    })),
  }
}

function createDevApiPlugin(): Plugin {
  return {
    name: 'fun-admin-dev-api',
    configureServer(server) {
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
              rawFilter === 'ready' || rawFilter === 'needs_review' ? rawFilter : 'all'

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

          next()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown API error'
          sendJson(res, 500, { message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), createDevApiPlugin()],
})
