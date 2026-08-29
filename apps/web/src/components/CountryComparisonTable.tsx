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
  endYear: number
}

const METRIC_CONFIG: Array<{
  key: ComparisonMetric
  label: string
  definition: string
  interpretation: string
  calculation: (endYear: number) => string
  sourceLabel: string
  sourceDetail: string
  formatter: (value: number | null) => string
}> = [
  {
    key: 'gdpPerCapitaUsd',
    label: 'GDP / Capita',
    definition: 'GDP per person, adjusted for population size.',
    interpretation: 'Higher values generally indicate greater average income and economic output per resident; lower values suggest weaker purchasing power and economic activity.',
    calculation: (endYear) => `World Bank indicator NY.GDP.PCAP.CD for ${endYear} (current USD).`,
    sourceLabel: 'WB',
    sourceDetail: 'World Bank, NY.GDP.PCAP.CD',
    formatter: (value) => (value == null ? '—' : `$${value.toLocaleString()}`),
  },
  {
    key: 'population',
    label: 'Population',
    definition: 'Total population count.',
    interpretation: 'This indicates the scale of a country and helps interpret absolute economic and energy metrics; larger populations often imply greater total demand and total output.',
    calculation: (endYear) => `World Bank indicator SP.POP.TOTL for ${endYear}.`,
    sourceLabel: 'WB',
    sourceDetail: 'World Bank, SP.POP.TOTL',
    formatter: (value) => (value == null ? '—' : value.toLocaleString()),
  },
  {
    key: 'taxRevenuePctGdp',
    label: 'Tax Revenue % GDP',
    definition: 'Total tax revenue collected as a share of gross domestic product.',
    interpretation: 'Higher values indicate the government raises more tax relative to the economy; lower values suggest a lighter tax burden or smaller public revenue base.',
    calculation: (endYear) => `World Bank indicator GC.TAX.TOTL.GD.ZS for ${endYear}.`,
    sourceLabel: 'WB',
    sourceDetail: 'World Bank, GC.TAX.TOTL.GD.ZS',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'lifeExpectancy',
    label: 'Life Expectancy',
    definition: 'Average number of years a person is expected to live at birth.',
    interpretation: 'Higher values usually indicate better overall public health, healthcare access, and living conditions; lower values suggest a heavier health burden.',
    calculation: (endYear) => `World Bank indicator SP.DYN.LE00.IN for ${endYear}; falls back to IHME if unavailable.`,
    sourceLabel: 'WB/IHME',
    sourceDetail: 'World Bank SP.DYN.LE00.IN, fallback IHME',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)} yrs`),
  },
  {
    key: 'daly100k',
    label: 'DALYs / 100k',
    definition: 'Disability-adjusted life years lost per 100,000 people.',
    interpretation: 'This measures lost healthy life due to illness and early death. Lower is better because it means fewer years of healthy life are being lost.',
    calculation: (endYear) => `IHME DALY rate (all causes, both sexes, all ages) for ${endYear} from processed dataset.`,
    sourceLabel: 'IHME',
    sourceDetail: 'IHME GBD export (processed)',
    formatter: (value) => (value == null ? '—' : value.toLocaleString()),
  },
  {
    key: 'giniCoefficient',
    label: 'Gini',
    definition: 'A summary measure of income inequality.',
    interpretation: 'Higher values indicate greater inequality; lower values suggest a more even distribution of income across households.',
    calculation: (endYear) => `World Bank indicator SI.POV.GINI for ${endYear}.`,
    sourceLabel: 'WB',
    sourceDetail: 'World Bank, SI.POV.GINI',
    formatter: (value) => (value == null ? '—' : value.toFixed(1)),
  },
  {
    key: 'urbanPopulationPct',
    label: 'Urban Pop %',
    definition: 'Share of the population living in urban areas.',
    interpretation: 'Higher values usually reflect greater urbanisation, infrastructure concentration, and service demand; lower values suggest more rural populations.',
    calculation: (endYear) => `World Bank indicator SP.URB.TOTL.IN.ZS for ${endYear}.`,
    sourceLabel: 'WB',
    sourceDetail: 'World Bank, SP.URB.TOTL.IN.ZS',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'internetPenetrationPct',
    label: 'Internet %',
    definition: 'Share of the population using the internet.',
    interpretation: 'Higher values indicate stronger digital connectivity and access to online services, information, and commerce.',
    calculation: (endYear) => `World Bank indicator IT.NET.USER.ZS for ${endYear}.`,
    sourceLabel: 'WB',
    sourceDetail: 'World Bank, IT.NET.USER.ZS',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'renewableSharePct',
    label: 'Renewable %',
    definition: 'Share of total energy supply coming from renewable sources.',
    interpretation: 'Higher percentages imply a cleaner, more diversified energy mix; lower percentages usually mean greater dependence on fossil fuels.',
    calculation: (endYear) => `OWID renewables_share_energy for ${endYear} (percentage of energy).`,
    sourceLabel: 'OWID',
    sourceDetail: 'OWID, renewables_share_energy',
    formatter: (value) => (value == null ? '—' : `${value.toFixed(1)}%`),
  },
  {
    key: 'primaryEnergyTwh',
    label: 'Energy (TWh)',
    definition: 'Total primary energy consumed in terawatt-hours.',
    interpretation: 'Higher values indicate greater total energy use; this is useful for comparing scale, but it should be interpreted alongside population and efficiency metrics.',
    calculation: (endYear) => `OWID primary_energy_consumption for ${endYear} (TWh).`,
    sourceLabel: 'OWID',
    sourceDetail: 'OWID, primary_energy_consumption',
    formatter: (value) => (value == null ? '—' : value.toLocaleString()),
  },
]

export default function CountryComparisonTable({
  rows,
  selectedIso3,
  onCountrySelect,
  endYear,
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
          <h3 className="text-sm font-semibold text-gray-200">Country Comparison</h3>
          <p className="mt-1">
            <span className="inline-flex rounded-full border border-accent-blue/50 bg-accent-blue/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-blue">
              Year {endYear}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Select comparison metric">
          {METRIC_CONFIG.map((metric) => (
            <div key={metric.key} className="group relative z-50">
              <button
                type="button"
                onClick={() => setSelectedMetric(metric.key)}
                className={[
                  'rounded-full border px-2.5 py-1 text-[11px] transition',
                  selectedMetric === metric.key
                    ? 'border-accent-blue/70 bg-accent-blue/10 text-accent-blue'
                    : 'border-surface-600 bg-surface-700 text-gray-300 hover:border-surface-500',
                ].join(' ')}
              >
                {metric.label}
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[11px] leading-5 text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100 whitespace-normal">
                <div className="font-medium text-accent-blue">{metric.label}</div>
                <div className="mt-1 text-gray-300">{metric.definition}</div>
                <div className="mt-1 text-gray-400">{metric.interpretation}</div>
                <div className="mt-1 text-gray-500">Calculation: {metric.calculation(endYear)}</div>
                <div className="mt-1 text-gray-500">Source: {metric.sourceDetail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hidden">
        <table className="w-max min-w-full table-auto border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
              <th className="sticky left-0 top-0 z-30 w-44 border-r border-surface-600 bg-surface-900 px-1.5 py-1 text-center font-medium shadow-[8px_0_12px_-10px_rgba(0,0,0,0.75)]">Country</th>
              {METRIC_CONFIG.map((metric) => (
                <th key={metric.key} className="sticky top-0 z-20 bg-surface-900 px-2 py-1 text-center font-medium align-bottom hover:z-40">
                  <div className="group relative inline-block">
                    <span className="block max-w-[16ch] cursor-help whitespace-normal break-normal text-center leading-4 underline decoration-dotted underline-offset-4">{metric.label}</span>
                    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[11px] leading-5 text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100 whitespace-normal">
                      <div className="font-medium text-accent-blue">{metric.label}</div>
                      <div className="mt-1 text-gray-300">{metric.definition}</div>
                      <div className="mt-1 text-gray-400">{metric.interpretation}</div>
                      <div className="mt-1 text-gray-500">Calculation: {metric.calculation(endYear)}</div>
                      <div className="mt-1 text-gray-500">Source: {metric.sourceDetail}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const isSelected = row.iso3 === selectedIso3

              return (
                <tr
                  key={row.iso3}
                  className={[
                    'rounded-lg text-gray-200',
                    isSelected ? 'bg-accent-blue/10 ring-1 ring-accent-blue/40' : 'bg-surface-900/60',
                  ].join(' ')}
                >
                  <td
                    className={[
                      'sticky left-0 z-10 rounded-l-lg border-r border-surface-700 px-1.5 py-1.5 align-middle shadow-[8px_0_12px_-10px_rgba(0,0,0,0.75)]',
                      isSelected ? 'bg-surface-800' : 'bg-surface-900',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => onCountrySelect(row.iso3)}
                      className="flex items-center gap-2 text-left font-medium text-white"
                    >
                      <span
                        className={[
                          'inline-flex h-2.5 w-2.5 rounded-full',
                          isSelected ? 'bg-accent-yellow shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-surface-500',
                        ].join(' ')}
                      />
                      <span>{row.countryName}</span>
                    </button>
                  </td>
                  {METRIC_CONFIG.map((metric) => {
                    const displayValue = metric.formatter(row[metric.key])
                    return (
                      <td key={`${row.iso3}-${metric.key}`} className="relative z-0 px-2 py-1.5 align-middle text-center text-gray-300 whitespace-nowrap hover:z-40">
                        <div className="group relative inline-block">
                          <span className="cursor-help underline decoration-dotted underline-offset-4">{displayValue}</span>
                          <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[11px] leading-5 text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100 whitespace-normal">
                            <div className="font-medium text-accent-blue">{metric.label}</div>
                            <div className="mt-1 text-gray-300">Value: {displayValue}</div>
                            <div className="mt-1 text-gray-500">Calculation: {metric.calculation(endYear)}</div>
                            <div className="mt-1 text-gray-500">Source: {metric.sourceDetail}</div>
                            <div className="mt-1 text-gray-500">Source Badge: {metric.sourceLabel}</div>
                            {metric.key === selectedMetric && (
                              <div className="mt-1 text-gray-500">Rank: #{index + 1}</div>
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
