import type { Env, GlobalEntityMetric, AnalyticsEventPayload } from './types'
import { joinMetrics } from './data'
import { fetchWorldBankMetrics } from './sources/worldBank'
import { fetchWorldBankMetricsForCountries } from './sources/worldBank'
import { fetchOwidMetrics } from './sources/owid'
import { DASHBOARD_COUNTRY_ISO3 } from './countryCatalog'

/** TTL for KV cache entries: 24 hours in seconds */
const CACHE_TTL_SECONDS = 86_400

/** CORS headers returned on every response */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status)
}

/** ---- Route: GET /api/data ---- */
async function handleData(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url)
  const iso3 = (url.searchParams.get('iso3') ?? 'USA').toUpperCase()
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : 2023
  const startYearParam = url.searchParams.get('startYear')
  const endYearParam = url.searchParams.get('endYear')
  const startYear = startYearParam ? parseInt(startYearParam, 10) : Math.max(1990, year - 6)
  const endYear = endYearParam ? parseInt(endYearParam, 10) : year

  if (!/^[A-Z]{3}$/.test(iso3)) {
    return errorJson('iso3 must be a 3-letter ISO country code')
  }
  if (
    isNaN(year) || year < 1990 || year > 2026 ||
    isNaN(startYear) || isNaN(endYear) ||
    startYear < 1990 || endYear > 2026 || startYear > endYear
  ) {
    return errorJson('startYear and endYear must be between 1990 and 2026, with startYear <= endYear')
  }

  const cacheKey = `data:${iso3}:${startYear}:${endYear}`

  // Try KV cache first
  const cached = await env.GLOBAL_DATA_KV.get(cacheKey, 'json')
  if (cached !== null) {
    return json({ data: cached, cached: true, lastUpdated: new Date().toISOString() })
  }

  // Build a small time-series (current year + 5 prior years) for chart rendering
  let worldBankMetrics: Map<number, Partial<GlobalEntityMetric>>
  try {
    worldBankMetrics = await fetchWorldBankMetrics(iso3, startYear, endYear)
  } catch {
    worldBankMetrics = new Map()
  }

  const dashboardCountries = new Set([iso3])
  let owidMetrics: Map<string, Partial<GlobalEntityMetric>>
  try {
    owidMetrics = await fetchOwidMetrics(dashboardCountries, startYear, endYear)
  } catch {
    owidMetrics = new Map()
  }

  const series: GlobalEntityMetric[] = []
  for (let y = startYear; y <= endYear; y++) {
    series.push({
      ...joinMetrics(iso3, y),
      ...(worldBankMetrics.get(y) ?? {}),
      ...(owidMetrics.get(`${iso3}:${y}`) ?? {}),
    })
  }

  // Store in KV with 24-hour TTL
  await env.GLOBAL_DATA_KV.put(cacheKey, JSON.stringify(series), {
    expirationTtl: CACHE_TTL_SECONDS,
  })

  return json({ data: series, cached: false, lastUpdated: new Date().toISOString() })
}

/** ---- Route: GET /api/country-metrics ---- */
async function handleCountryMetrics(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url)
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : 2023

  if (isNaN(year) || year < 1990 || year > 2026) {
    return errorJson('year must be between 1990 and 2026')
  }

  const cacheKey = `country-metrics:${year}`
  const cached = await env.GLOBAL_DATA_KV.get(cacheKey, 'json')
  if (cached !== null) {
    return json({ data: cached, cached: true, year, lastUpdated: new Date().toISOString() })
  }

  let wbByCountryYear = new Map<string, Partial<GlobalEntityMetric>>()
  try {
    wbByCountryYear = await fetchWorldBankMetricsForCountries(DASHBOARD_COUNTRY_ISO3, year, year)
  } catch {
    wbByCountryYear = new Map()
  }

  let owidByCountryYear = new Map<string, Partial<GlobalEntityMetric>>()
  try {
    owidByCountryYear = await fetchOwidMetrics(new Set(DASHBOARD_COUNTRY_ISO3), year, year)
  } catch {
    owidByCountryYear = new Map()
  }

  const rows = DASHBOARD_COUNTRY_ISO3.map((iso3) => ({
    ...joinMetrics(iso3, year),
    ...(wbByCountryYear.get(`${iso3}:${year}`) ?? {}),
    ...(owidByCountryYear.get(`${iso3}:${year}`) ?? {}),
  }))

  await env.GLOBAL_DATA_KV.put(cacheKey, JSON.stringify(rows), {
    expirationTtl: CACHE_TTL_SECONDS,
  })

  return json({ data: rows, cached: false, year, lastUpdated: new Date().toISOString() })
}

/** ---- Route: GET /api/summary ---- */
async function handleSummary(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url)
  const iso3 = (url.searchParams.get('iso3') ?? 'USA').toUpperCase()
  const yearParam = url.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : 2023

  if (!/^[A-Z]{3}$/.test(iso3)) {
    return errorJson('iso3 must be a 3-letter ISO country code')
  }
  if (isNaN(year) || year < 1990 || year > 2026) {
    return errorJson('year must be between 1990 and 2026')
  }

  const summaryKey = `summary:${iso3}:${year}`

  // Try KV cache
  const cachedSummary = await env.GLOBAL_DATA_KV.get(summaryKey)
  if (cachedSummary !== null) {
    return json({ text: cachedSummary, generatedAt: new Date().toISOString(), cached: true })
  }

  const metric = joinMetrics(iso3, year)

  const prompt =
    `You are a global development analyst. Provide a concise 3-sentence summary ` +
    `of ${metric.countryName}'s economic, health, and energy performance in ${year}. ` +
    `Key data: GDP/capita $${metric.gdpPerCapitaUsd?.toLocaleString() ?? 'N/A'}, ` +
    `life expectancy ${metric.lifeExpectancy ?? 'N/A'} years, ` +
    `DALYs per 100k ${metric.daly100k?.toLocaleString() ?? 'N/A'}, ` +
    `renewable energy share ${metric.renewableSharePct ?? 'N/A'}%. ` +
    `Be analytical and avoid generic statements.`

  const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  }) as { response: string }

  const text = aiResponse.response?.trim() ?? 'Summary unavailable.'

  // Cache summary for 24 hours
  await env.GLOBAL_DATA_KV.put(summaryKey, text, {
    expirationTtl: CACHE_TTL_SECONDS,
  })

  return json({ text, generatedAt: new Date().toISOString(), cached: false })
}

/** ---- Worker entry point ---- */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const { pathname } = new URL(request.url)

    if (pathname === '/api/data') return handleData(request, env)
    if (pathname === '/api/country-metrics') return handleCountryMetrics(request, env)
    if (pathname === '/api/summary') return handleSummary(request, env)
    if (pathname === '/api/usage-events') {
      const usageKey = 'analytics:events'
      const stored = await env.GLOBAL_DATA_KV.get(usageKey, 'json') as Array<Record<string, unknown>> | null
      return json({ data: stored ?? [] })
    }
    if (pathname === '/api/track') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
      }

      try {
        const payload = await request.json() as AnalyticsEventPayload
        const userId = payload.userId ?? payload.sessionId ?? 'anonymous'
        const key = `analytics:${Date.now()}:${userId}`
        const eventEntry = {
          ...payload,
          userId,
          ipCountry: (request.cf as { country?: string } | undefined)?.country ?? null,
          ipCity: (request.cf as { city?: string } | undefined)?.city ?? null,
        }

        const existing = await env.GLOBAL_DATA_KV.get('analytics:events', 'json') as Array<Record<string, unknown>> | null
        const nextEvents = [...(existing ?? []), eventEntry]
        await env.GLOBAL_DATA_KV.put('analytics:events', JSON.stringify(nextEvents.slice(-200)), {
          expirationTtl: 60 * 60 * 24 * 30,
        })
        await env.GLOBAL_DATA_KV.put(key, JSON.stringify(eventEntry), {
          expirationTtl: 60 * 60 * 24 * 30,
        })
        return json({ ok: true })
      } catch {
        return json({ error: 'Invalid analytics payload' }, 400)
      }
    }

    return json({ status: 'Global Intelligence Analytics Worker', routes: ['/api/data', '/api/country-metrics', '/api/summary', '/api/track', '/api/usage-events'] })
  },
}
