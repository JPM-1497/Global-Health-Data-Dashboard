import type { GlobalEntityMetric } from '../types'

const OWID_ENERGY_CSV =
  'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv'

function parseCsvLine(line: string): string[] {
  const values: string[] = []
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

function toNumber(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function fetchOwidMetrics(
  iso3Countries: Set<string>,
  startYear: number,
  endYear: number,
): Promise<Map<string, Partial<GlobalEntityMetric>>> {
  const response = await fetch(OWID_ENERGY_CSV)
  if (!response.ok) throw new Error(`OWID request failed: ${response.status}`)

  const lines = (await response.text()).split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('OWID returned an empty dataset')

  const headers = parseCsvLine(lines[0])
  const columnIndex = new Map(headers.map((header, index) => [header, index]))
  const requiredColumns = [
    'iso_code',
    'country',
    'year',
    'primary_energy_consumption',
    'energy_per_capita',
    'renewables_share_energy',
  ]
  if (requiredColumns.some((column) => !columnIndex.has(column))) {
    throw new Error('OWID dataset is missing a required energy column')
  }

  const metrics = new Map<string, Partial<GlobalEntityMetric>>()
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const iso3 = values[columnIndex.get('iso_code')!]
    const year = Number(values[columnIndex.get('year')!])
    if (!iso3Countries.has(iso3) || year < startYear || year > endYear) continue

    metrics.set(`${iso3}:${year}`, {
      countryName: values[columnIndex.get('country')!],
      primaryEnergyTwh: toNumber(values[columnIndex.get('primary_energy_consumption')!]),
      primaryEnergyPerCapitaKwh: toNumber(values[columnIndex.get('energy_per_capita')!]),
      renewableSharePct: toNumber(values[columnIndex.get('renewables_share_energy')!]),
    })
  }

  return metrics
}