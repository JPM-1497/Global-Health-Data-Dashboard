import { useMemo, useState } from 'react'

type ComparisonMetric =
  | 'gdpPerCapitaUsd'
  | 'population'
  | 'taxRevenuePctGdp'
  | 'lifeExpectancy'
  | 'daly100k'
  | 'giniCoefficient'
  | 'urbanPopulationPct'
  | 'internetPenetrationPct'
  | 'renewableSharePct'
  | 'primaryEnergyTwh'

interface ComparisonRow {
  iso3: string
  countryName: string
  gdpPerCapitaUsd: number | null
  population: number | null
  taxRevenuePctGdp: number | null
  lifeExpectancy: number | null
  daly100k: number | null
  giniCoefficient: number | null
  urbanPopulationPct: number | null
  internetPenetrationPct: number | null
  renewableSharePct: number | null
  primaryEnergyTwh: number | null
}

interface CountryComparisonTableProps {
  rows: ComparisonRow[]
  selectedIso3: string
  onCountrySelect: (iso3: string) => void
}

const METRIC_CONFIG: Array<{
  key: ComparisonMetric
  label: string
  definition: string
  interpretation: string
  formatter: (value: number | null) => string
}> = [
  {
    key: 'gdpPerCapitaUsd',
    label: 'GDP / Capita',
    definition: 'GDP per person, adjusted for population size.',
    interpretation: 'Higher values generally indicate greater average income and economic output per resident; lower values suggest weaker purchasing power and economic activity.',
    formatter: (value) => (value == null ? '—' : `$${value.toLocaleString()}`),
  },
  {
    key: 'population',
    label: 'Population',
    definition: 'Total population count.',
    interpretation: 'This indicates the scale of a country and helps interpret absolute economic and energy metrics; larger populations often imply greater total demand and total output.',
    formatter: (value) => (value == null ? '—' : value.toLocaleString()),
  },
  {
    key: 'taxRevenuePctGdp',
    label: 'Tax Revenue % GDP',
    definition: 'Total tax revenue collected as a share of gross domestic product.',
    interpretation: 'Higher values indicate the government raises more tax relative to the economy; lower values suggest a lighter tax burden or smaller public revenue base.',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'lifeExpectancy',
    label: 'Life Expectancy',
    definition: 'Average number of years a person is expected to live at birth.',
    interpretation: 'Higher values usually indicate better overall public health, healthcare access, and living conditions; lower values suggest a heavier health burden.',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)} yrs`),
  },
  {
    key: 'daly100k',
    label: 'DALYs / 100k',
    definition: 'Disability-adjusted life years lost per 100,000 people.',
    interpretation: 'This measures lost healthy life due to illness and early death. Lower is better because it means fewer years of healthy life are being lost.',
    formatter: (value) => (value == null ? '—' : value.toLocaleString()),
  },
  {
    key: 'giniCoefficient',
    label: 'Gini',
    definition: 'A summary measure of income inequality.',
    interpretation: 'Higher values indicate greater inequality; lower values suggest a more even distribution of income across households.',
    formatter: (value) => (value == null ? '—' : value.toFixed(1)),
  },
  {
    key: 'urbanPopulationPct',
    label: 'Urban Pop %',
    definition: 'Share of the population living in urban areas.',
    interpretation: 'Higher values usually reflect greater urbanisation, infrastructure concentration, and service demand; lower values suggest more rural populations.',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'internetPenetrationPct',
    label: 'Internet %',
    definition: 'Share of the population using the internet.',
    interpretation: 'Higher values indicate stronger digital connectivity and access to online services, information, and commerce.',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'renewableSharePct',
    label: 'Renewable %',
    definition: 'Share of total energy supply coming from renewable sources.',
    interpretation: 'Higher percentages imply a cleaner, more diversified energy mix; lower percentages usually mean greater dependence on fossil fuels.',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'primaryEnergyTwh',
    label: 'Energy (TWh)',
    definition: 'Total primary energy consumed in terawatt-hours.',
    interpretation: 'Higher values indicate greater total energy use; this is useful for comparing scale, but it should be interpreted alongside population and efficiency metrics.',
    formatter: (value) => (value == null ? '—' : value.toLocaleString()),
  },
]

export default function CountryComparisonTable({
  rows,
  selectedIso3,
  onCountrySelect,
}: CountryComparisonTableProps) {
  const [selectedMetric, setSelectedMetric] = useState<ComparisonMetric>('gdpPerCapitaUsd')

  const sortedRows = useMemo(() => {
    const metric = METRIC_CONFIG.find((option) => option.key === selectedMetric) ?? METRIC_CONFIG[0]
    return [...rows].sort((left, right) => {
      const lValue = left[metric.key] ?? 0
      const rValue = right[metric.key] ?? 0
      return Number(rValue) - Number(lValue)
    })
  }, [rows, selectedMetric])

  return (
    <div className="card space-y-4 border-surface-600/80 bg-surface-800/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Country comparison</h3>
          <p className="mt-1 text-xs text-gray-500">Ranked by the selected metric for the active year</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Select comparison metric">
          {METRIC_CONFIG.map((metric) => (
            <div key={metric.key} className="group relative">
              <button
                type="button"
                onClick={() => setSelectedMetric(metric.key)}
                className={[
                  'rounded-full border px-2.5 py-1 text-[11px] transition',
                  selectedMetric === metric.key
                    ? 'border-accent-blue/70 bg-accent-blue/10 text-accent-blue'
                    : 'border-surface-600 bg-surface-700 text-gray-300 hover:border-surface-500',
                ].join(' ')}
                title={metric.definition}
              >
                {metric.label}
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[11px] leading-5 text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100 whitespace-normal">
                <div className="font-medium text-accent-blue">{metric.label}</div>
                <div className="mt-1 text-gray-300">{metric.definition}</div>
                <div className="mt-1 text-gray-400">{metric.interpretation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              <th className="px-2 py-1 font-medium">Country</th>
              {METRIC_CONFIG.map((metric) => (
                <th key={metric.key} className="px-2 py-1 font-medium">
                  <div className="group relative inline-block">
                    <span className="cursor-help underline decoration-dotted underline-offset-4">{metric.label}</span>
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[11px] leading-5 text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100 whitespace-normal">
                      <div className="font-medium text-accent-blue">{metric.label}</div>
                      <div className="mt-1 text-gray-300">{metric.definition}</div>
                      <div className="mt-1 text-gray-400">{metric.interpretation}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const isSelected = row.iso3 === selectedIso3
              const currentMetric = row[selectedMetric] ?? null
              const maxValue = sortedRows.reduce((accumulator, item) => {
                const value = item[selectedMetric] ?? 0
                return Math.max(accumulator, Number(value))
              }, 0)
              const barWidth = maxValue > 0 && currentMetric != null ? Math.max((Number(currentMetric) / maxValue) * 100, 8) : 0

              return (
                <tr
                  key={row.iso3}
                  className={[
                    'rounded-lg text-gray-200',
                    isSelected ? 'bg-accent-blue/10 ring-1 ring-accent-blue/40' : 'bg-surface-900/60',
                  ].join(' ')}
                >
                  <td className="rounded-l-lg px-2 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => onCountrySelect(row.iso3)}
                      className="flex items-center gap-2 text-left font-medium text-white"
                    >
                      <span className={[
                        'inline-flex h-2.5 w-2.5 rounded-full',
                        isSelected ? 'bg-accent-yellow shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-surface-500',
                      ].join(' ')} />
                      <span>{row.countryName}</span>
                    </button>
                  </td>
                  {METRIC_CONFIG.map((metric) => (
                    <td key={`${row.iso3}-${metric.key}`} className="px-2 py-2 align-middle text-gray-300">
                      {metric.key === selectedMetric ? (
                        <div className="min-w-[90px]">
                          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-gray-300">
                            <span>{metric.formatter(row[metric.key])}</span>
                            <span className="text-gray-500">#{index + 1}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-yellow"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span>{metric.formatter(row[metric.key])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
