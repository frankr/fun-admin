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
  activeLocations: number
  openIssues: number
}

type ActivityListItem = {
  externalId: string
  name: string
  location: string | null
  websiteUrl: string | null
  category: string
  status: 'active' | 'inactive'
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
      COALESCE(loc.location_count, 0)::int AS active_locations,
      COALESCE(issues.open_issues, 0)::int AS open_issues
    FROM activities a
    JOIN cities c ON c.id = a.city_id
    LEFT JOIN (
      SELECT a2.city_id, COUNT(*)::int AS location_count
      FROM activity_locations al
      JOIN activities a2 ON a2.id = al.activity_id
      GROUP BY a2.city_id
    ) loc ON loc.city_id = a.city_id
    LEFT JOIN (
      SELECT a3.city_id, COUNT(*)::int AS open_issues
      FROM activity_data_issues adi
      JOIN activities a3 ON a3.id = adi.activity_id
      WHERE adi.status = 'open'
      GROUP BY a3.city_id
    ) issues ON issues.city_id = a.city_id
    WHERE c.code = $1
      AND a.status = 'active'
    GROUP BY loc.location_count, issues.open_issues
  `

  const result = await pool.query<{
    total_activities: number
    new_this_week: number
    active_locations: number
    open_issues: number
  }>(query, [cityCode])

  if (result.rowCount === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    totalActivities: row.total_activities,
    newThisWeek: row.new_this_week,
    activeLocations: row.active_locations,
    openIssues: row.open_issues,
  }
}

async function getActivities(
  cityCode: string,
  search: string,
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
  `

  const countResult = await pool.query<{ total: number }>(countSql, [cityCode, searchPattern])
  const total = countResult.rows[0]?.total ?? 0

  const listSql = `
    SELECT
      a.external_id,
      a.name,
      NULLIF(SPLIT_PART(COALESCE(loc.address_raw, ''), E'\\n', 1), '') AS location,
      a.website_url,
      COALESCE(cat.label, 'Uncategorized') AS category,
      a.status
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
    WHERE c.code = $1
      AND a.status = 'active'
      AND (
        $2::text IS NULL
        OR a.name ILIKE $2
        OR COALESCE(loc.address_raw, '') ILIKE $2
      )
    ORDER BY a.name ASC
    LIMIT $3 OFFSET $4
  `

  const listResult = await pool.query<{
    external_id: string
    name: string
    location: string | null
    website_url: string | null
    category: string
    status: 'active' | 'inactive'
  }>(listSql, [cityCode, searchPattern, pageSize, offset])

  return {
    page,
    pageSize,
    total,
    items: listResult.rows.map((row) => ({
      externalId: row.external_id,
      name: row.name,
      location: row.location,
      websiteUrl: row.website_url,
      category: row.category,
      status: row.status,
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
            const activities = await getActivities(cityCode, search, safePage, safePageSize)
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
