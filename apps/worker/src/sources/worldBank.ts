import type { GlobalEntityMetric } from '../types'

const WORLD_BANK_API = 'https://api.worldbank.org/v2'

const INDICATORS = {
  gdpUsd: 'NY.GDP.MKTP.CD',
  gdpPerCapitaUsd: 'NY.GDP.PCAP.CD',
  gdpGrowthRate: 'NY.GDP.MKTP.KD.ZG',
  population: 'SP.POP.TOTL',
  taxRevenuePctGdp: 'GC.TAX.TOTL.GD.ZS',
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
  const byCountryYear = await fetchWorldBankMetricsForCountries([iso3], startYear, endYear)
  const byYear = new Map<number, Partial<GlobalEntityMetric>>()
  for (let year = startYear; year <= endYear; year++) {
    const metric = byCountryYear.get(`${iso3}:${year}`)
    if (metric) byYear.set(year, metric)
  }
  return byYear
}

export async function fetchWorldBankMetricsForCountries(
  iso3List: string[],
  startYear: number,
  endYear: number,
): Promise<Map<string, Partial<GlobalEntityMetric>>> {
  const countries = [...new Set(iso3List.map((iso3) => iso3.toUpperCase()))]
  if (countries.length === 0) return new Map()

  const countryPath = countries.join(';')
  const entries = await Promise.all(
    (Object.entries(INDICATORS) as [WorldBankIndicator, string][]).map(
      async ([name, indicator]) => [
        name,
        await fetchIndicator(countryPath, indicator, startYear, endYear),
      ] as const,
    ),
  )

  const byCountryYear = new Map<string, Partial<GlobalEntityMetric>>()

  for (const [name, rows] of entries) {
    for (const row of rows) {
      const iso3 = row.countryiso3code?.toUpperCase()
      const year = Number(row.date)
      if (!iso3 || !Number.isInteger(year) || !countries.includes(iso3)) continue

      const key = `${iso3}:${year}`
      const current = byCountryYear.get(key) ?? {}
      current[name] = toNumber(row.value)
      if (row.country?.value) current.countryName = row.country.value
      byCountryYear.set(key, current)
    }
  }

  return byCountryYear
}