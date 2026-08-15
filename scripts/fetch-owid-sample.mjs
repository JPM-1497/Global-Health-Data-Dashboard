import { mkdir, writeFile } from 'node:fs/promises'

const countries = ['USA', 'CHN', 'IND', 'DEU', 'GBR', 'BRA', 'NGA', 'ZAF', 'JPN', 'AUS']
const startYear = 1990
const endYear = 2023
const sourceUrl = 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv'

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

function numberOrNull(value) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const response = await fetch(sourceUrl)
if (!response.ok) throw new Error(`OWID request failed: ${response.status}`)

const lines = (await response.text()).split(/\r?\n/).filter(Boolean)
const headers = parseCsvLine(lines[0])
const columnIndex = new Map(headers.map((header, index) => [header, index]))
const records = []

for (const line of lines.slice(1)) {
  const values = parseCsvLine(line)
  const countryCode = values[columnIndex.get('iso_code')]
  const year = Number(values[columnIndex.get('year')])
  if (!countries.includes(countryCode) || year < startYear || year > endYear) continue

  records.push({
    countryCode,
    countryName: values[columnIndex.get('country')],
    year,
    primaryEnergyTwh: numberOrNull(values[columnIndex.get('primary_energy_consumption')]),
    primaryEnergyPerCapitaKwh: numberOrNull(values[columnIndex.get('energy_per_capita')]),
    renewableSharePct: numberOrNull(values[columnIndex.get('renewables_share_energy')]),
  })
}

const output = {
  source: 'Our World in Data energy-data',
  sourceUrl,
  fetchedAt: new Date().toISOString(),
  countries,
  yearRange: { start: startYear, end: endYear },
  records,
}

await mkdir('data/raw/owid', { recursive: true })
await writeFile('data/raw/owid/energy-sample.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Wrote ${records.length} records to data/raw/owid/energy-sample.json`)