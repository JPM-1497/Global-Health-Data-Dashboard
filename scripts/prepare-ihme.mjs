import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const inputDirectory = process.argv[2] ?? 'data/raw/ihme'
const outputPath = process.argv[3] ?? 'data/processed/ihme/health.json'
const dashboardCountries = new Map([
  ['Antigua and Barbuda', 'ATG'],
  ['Argentina', 'ARG'],
  ['Bahamas', 'BHS'],
  ['Barbados', 'BRB'],
  ['Belize', 'BLZ'],
  ['Bolivia', 'BOL'],
  ['Brazil', 'BRA'],
  ['Canada', 'CAN'],
  ['Chile', 'CHL'],
  ['Colombia', 'COL'],
  ['Costa Rica', 'CRI'],
  ['Cuba', 'CUB'],
  ['Dominica', 'DMA'],
  ['Dominican Republic', 'DOM'],
  ['Ecuador', 'ECU'],
  ['El Salvador', 'SLV'],
  ['Grenada', 'GRD'],
  ['Guatemala', 'GTM'],
  ['Guyana', 'GUY'],
  ['Haiti', 'HTI'],
  ['Honduras', 'HND'],
  ['Jamaica', 'JAM'],
  ['Mexico', 'MEX'],
  ['Nicaragua', 'NIC'],
  ['Panama', 'PAN'],
  ['Paraguay', 'PRY'],
  ['Peru', 'PER'],
  ['Saint Kitts and Nevis', 'KNA'],
  ['Saint Lucia', 'LCA'],
  ['Saint Vincent and the Grenadines', 'VCT'],
  ['Suriname', 'SUR'],
  ['Trinidad and Tobago', 'TTO'],
  ['United States', 'USA'],
  ['United States of America', 'USA'],
  ['Uruguay', 'URY'],
  ['Venezuela', 'VEN'],
  ['Austria', 'AUT'],
  ['Belgium', 'BEL'],
  ['Czechia', 'CZE'],
  ['Czech Republic', 'CZE'],
  ['Denmark', 'DNK'],
  ['Finland', 'FIN'],
  ['France', 'FRA'],
  ['Germany', 'DEU'],
  ['Greece', 'GRC'],
  ['Hungary', 'HUN'],
  ['Ireland', 'IRL'],
  ['Italy', 'ITA'],
  ['Netherlands', 'NLD'],
  ['Norway', 'NOR'],
  ['Poland', 'POL'],
  ['Portugal', 'PRT'],
  ['Romania', 'ROU'],
  ['Spain', 'ESP'],
  ['Sweden', 'SWE'],
  ['Switzerland', 'CHE'],
  ['Ukraine', 'UKR'],
  ['United Kingdom', 'GBR'],
  ['China', 'CHN'],
  ['India', 'IND'],
  ['Nigeria', 'NGA'],
  ['South Africa', 'ZAF'],
  ['Japan', 'JPN'],
  ['Australia', 'AUS'],
])

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    const nextCharacter = line[index + 1]
    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"'
      index++
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += character
    }
  }
  values.push(value)
  return values
}

function valueAt(values, columns, ...names) {
  const name = names.find((candidate) => columns.has(candidate))
  return name ? values[columns.get(name)] : undefined
}

function numberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function iso3For(values, columns) {
  const directCode = valueAt(values, columns, 'iso3', 'iso_code', 'country_code')
  if (directCode) return directCode.toUpperCase()
  return dashboardCountries.get(valueAt(values, columns, 'location_name', 'country', 'entity'))
}

function isAllCauseDalyRate(values, columns) {
  const measure = valueAt(values, columns, 'measure_name', 'measure')?.toLowerCase() ?? ''
  const metric = valueAt(values, columns, 'metric_name', 'metric')?.toLowerCase() ?? ''
  const age = valueAt(values, columns, 'age_name', 'age')?.toLowerCase() ?? ''
  const sex = valueAt(values, columns, 'sex_name', 'sex')?.toLowerCase() ?? ''
  const cause = valueAt(values, columns, 'cause_name', 'cause')?.toLowerCase() ?? ''

  return measure.includes('daly') &&
    (!metric || metric === 'rate') &&
    (!age || age === 'all ages') &&
    (!sex || sex === 'both') &&
    (!cause || cause === 'all causes')
}

const files = (await readdir(inputDirectory)).filter((file) => file.toLowerCase().endsWith('.csv'))
if (files.length === 0) {
  throw new Error(`No IHME CSV files found in ${inputDirectory}. Download an authorized GBD export first.`)
}

const records = new Map()
for (const file of files) {
  const text = await readFile(join(inputDirectory, file), 'utf8')
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) continue

  const columns = new Map(parseCsvLine(lines[0]).map((column, index) => [column, index]))
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const countryCode = iso3For(values, columns)
    const year = Number(valueAt(values, columns, 'year'))
    const value = numberOrNull(valueAt(values, columns, 'val', 'value', 'mean'))
    const upper = numberOrNull(valueAt(values, columns, 'upper', 'upper_value'))
    const lower = numberOrNull(valueAt(values, columns, 'lower', 'lower_value'))
    const measure = valueAt(values, columns, 'measure_name', 'measure')?.toLowerCase() ?? file.toLowerCase()
    if (!countryCode || !Number.isInteger(year) || value === null) continue

    const key = `${countryCode}:${year}`
    const record = records.get(key) ?? {
      countryCode,
      countryName: valueAt(values, columns, 'location_name', 'country', 'entity') ?? countryCode,
      year,
    }
    if (measure.includes('life expectancy')) record.lifeExpectancy = value
    if (isAllCauseDalyRate(values, columns)) {
      record.dalysRate = value
      record.dalysRateUpper = upper
      record.dalysRateLower = lower
    }
    records.set(key, record)
  }
}

const output = {
  source: 'IHME Global Burden of Disease export',
  preparedAt: new Date().toISOString(),
  filters: {
    dalys: 'All causes, both sexes, all ages, rate',
    countries: [...new Set(dashboardCountries.values())],
  },
  records: [...records.values()].sort(
    (left, right) => left.countryCode.localeCompare(right.countryCode) || left.year - right.year,
  ),
}

await mkdir(join(outputPath, '..'), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote ${output.records.length} records to ${outputPath}`)