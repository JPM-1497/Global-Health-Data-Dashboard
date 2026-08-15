import type { GlobalEntityMetric } from '../types'

const WORLD_BANK_API = 'https://api.worldbank.org/v2'

const INDICATORS = {
  gdpUsd: 'NY.GDP.MKTP.CD',
  gdpPerCapitaUsd: 'NY.GDP.PCAP.CD',
  gdpGrowthRate: 'NY.GDP.MKTP.KD.ZG',
  population: 'SP.POP.TOTL',
  giniCoefficient: 'SI.POV.GINI',
  internetPenetrationPct: 'IT.NET.USER.ZS',
  urbanPopulationPct: 'SP.URB.TOTL.IN.ZS',
  lifeExpectancy: 'SP.DYN.LE00.IN',
} as const

type WorldBankIndicator = keyof typeof INDICATORS

interface WorldBankRow {
  countryiso3code?: string
  country?: { value?: string }
  date?: string
  value?: number | string | null
}

type WorldBankResponse = [unknown, WorldBankRow[]?]

function toNumber(value: WorldBankRow['value']): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchIndicator(
  iso3: string,
  indicator: string,
  startYear: number,
  endYear: number,
): Promise<WorldBankRow[]> {
  const url = new URL(`${WORLD_BANK_API}/country/${iso3}/indicator/${indicator}`)
  url.searchParams.set('date', `${startYear}:${endYear}`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('per_page', '100')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`World Bank request failed: ${response.status}`)
  }

  const payload = await response.json() as WorldBankResponse
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    throw new Error('World Bank returned an unexpected response')
  }

  return payload[1]
}

export async function fetchWorldBankMetrics(
  iso3: string,
  startYear: number,
  endYear: number,
): Promise<Map<number, Partial<GlobalEntityMetric>>> {
  const entries = await Promise.all(
    (Object.entries(INDICATORS) as [WorldBankIndicator, string][]).map(
      async ([name, indicator]) => [
        name,
        await fetchIndicator(iso3, indicator, startYear, endYear),
      ] as const,
    ),
  )

  const byYear = new Map<number, Partial<GlobalEntityMetric>>()

  for (const [name, rows] of entries) {
    for (const row of rows) {
      const year = Number(row.date)
      if (!Number.isInteger(year)) continue

      const current = byYear.get(year) ?? {}
      current[name] = toNumber(row.value)
      if (row.country?.value) current.countryName = row.country.value
      byYear.set(year, current)
    }
  }

  return byYear
}