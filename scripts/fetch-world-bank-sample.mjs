import { mkdir, writeFile } from 'node:fs/promises'

const countries = ['USA', 'CHN', 'IND', 'DEU', 'GBR', 'BRA', 'NGA', 'ZAF', 'JPN', 'AUS']
const startYear = 1990
const endYear = 2023
const indicators = {
  gdpUsd: 'NY.GDP.MKTP.CD',
  gdpPerCapitaUsd: 'NY.GDP.PCAP.CD',
  gdpGrowthRate: 'NY.GDP.MKTP.KD.ZG',
  population: 'SP.POP.TOTL',
  giniCoefficient: 'SI.POV.GINI',
  internetPenetrationPct: 'IT.NET.USER.ZS',
  urbanPopulationPct: 'SP.URB.TOTL.IN.ZS',
  lifeExpectancy: 'SP.DYN.LE00.IN',
}

const countryPath = countries.join(';')

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchIndicator(name, code) {
  const url = new URL(
    `https://api.worldbank.org/v2/country/${countryPath}/indicator/${code}`,
  )
  url.searchParams.set('date', `${startYear}:${endYear}`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('per_page', '20000')

  const response = await fetch(url)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)

  const payload = await response.json()
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    throw new Error(`${name}: unexpected World Bank response`)
  }

  return payload[1].map((row) => ({
    countryCode: row.countryiso3code,
    countryName: row.country?.value ?? row.countryiso3code,
    year: Number(row.date),
    value: numberOrNull(row.value),
  }))
}

const records = new Map()

for (const [name, code] of Object.entries(indicators)) {
  const rows = await fetchIndicator(name, code)
  for (const row of rows) {
    if (!countries.includes(row.countryCode) || !Number.isInteger(row.year)) continue

    const key = `${row.countryCode}:${row.year}`
    const record = records.get(key) ?? {
      countryCode: row.countryCode,
      countryName: row.countryName,
      year: row.year,
    }
    record[name] = row.value
    records.set(key, record)
  }
}

const output = {
  source: 'World Bank Indicators API',
  sourceUrl: 'https://api.worldbank.org/v2/',
  fetchedAt: new Date().toISOString(),
  countries,
  yearRange: { start: startYear, end: endYear },
  indicators,
  records: [...records.values()].sort(
    (left, right) => left.countryCode.localeCompare(right.countryCode) || left.year - right.year,
  ),
}

await mkdir('data/raw/world-bank', { recursive: true })
await writeFile(
  'data/raw/world-bank/sample.json',
  `${JSON.stringify(output, null, 2)}\n`,
  'utf8',
)

console.log(`Wrote ${output.records.length} records to data/raw/world-bank/sample.json`)