import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GlobalEntityMetric } from '../types'

type DistributionMetric =
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

const METRICS: Array<{ key: DistributionMetric; label: string; format: (value: number) => string }> = [
  { key: 'gdpPerCapitaUsd', label: 'GDP / capita', format: (value) => `$${Math.round(value).toLocaleString()}` },
  { key: 'population', label: 'Population', format: (value) => value.toLocaleString() },
  { key: 'taxRevenuePctGdp', label: 'Tax revenue % GDP', format: (value) => `${value.toFixed(1)}%` },
  { key: 'lifeExpectancy', label: 'Life expectancy', format: (value) => `${value.toFixed(1)} yrs` },
  { key: 'daly100k', label: 'DALYs / 100k', format: (value) => Math.round(value).toLocaleString() },
  { key: 'giniCoefficient', label: 'Gini', format: (value) => value.toFixed(1) },
  { key: 'urbanPopulationPct', label: 'Urban pop %', format: (value) => `${value.toFixed(1)}%` },
  { key: 'internetPenetrationPct', label: 'Internet access %', format: (value) => `${value.toFixed(1)}%` },
  { key: 'renewableSharePct', label: 'Renewables', format: (value) => `${value.toFixed(1)}%` },
  { key: 'primaryEnergyTwh', label: 'Primary energy', format: (value) => `${Math.round(value).toLocaleString()} TWh` },
]

interface PopulationInsightsProps {
  rows: GlobalEntityMetric[]
  selectedIso3: string
  endYear: number
}

export default function PopulationInsights({ rows, selectedIso3, endYear }: PopulationInsightsProps) {
  const [metricKey, setMetricKey] = useState<DistributionMetric>('lifeExpectancy')
  const metric = METRICS.find((option) => option.key === metricKey) ?? METRICS[0]
  const values = rows
    .map((row) => ({ countryName: row.countryName, iso3: row.iso3, value: row[metricKey] }))
    .filter((row): row is { countryName: string; iso3: string; value: number } => typeof row.value === 'number')

  const bins = useMemo(() => {
    if (!values.length) return []
    const minimum = Math.min(...values.map((row) => row.value))
    const maximum = Math.max(...values.map((row) => row.value))
    const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))))
    const width = maximum === minimum ? 1 : (maximum - minimum) / binCount
    const histogram = Array.from({ length: binCount }, (_, index) => ({
      label: metric.format(minimum + width * index),
      from: minimum + width * index,
      to: minimum + width * (index + 1),
      countries: 0,
    }))

    values.forEach(({ value }) => {
      const index = Math.min(Math.floor((value - minimum) / width), binCount - 1)
      histogram[index].countries += 1
    })
    return histogram
  }, [metric, values])

  const scatterData = rows
    .map((row) => ({ countryName: row.countryName, iso3: row.iso3, gdp: row.gdpPerCapitaUsd, lifeExpectancy: row.lifeExpectancy }))
    .filter((row): row is { countryName: string; iso3: string; gdp: number; lifeExpectancy: number } =>
      typeof row.gdp === 'number' && typeof row.lifeExpectancy === 'number',
    )
  const selectedCountry = scatterData.filter((row) => row.iso3 === selectedIso3)

  return (
    <section className="grid gap-5 xl:grid-cols-2" aria-label="Population insights">
      <div className="card border-[#f4efe2]/30 bg-[#1d3930] p-4 shadow-[0_14px_30px_rgba(2,16,12,0.2)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-surface-700/80 pb-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent-blue">Population distribution</p>
            <h3 className="mt-1 text-sm font-semibold text-white">Country spread in {endYear}</h3>
          </div>
          <select
            value={metricKey}
            onChange={(event) => setMetricKey(event.target.value as DistributionMetric)}
            aria-label="Distribution metric"
            className="rounded-md border border-surface-600 bg-surface-900 px-2.5 py-1.5 text-[11px] text-slate-200 [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          >
            {METRICS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </div>
        <p className="mt-3 text-xs text-slate-400">{values.length} countries with a reported {metric.label.toLowerCase()} value.</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins} margin={{ top: 8, right: 8, bottom: 6, left: -18 }}>
              <CartesianGrid vertical={false} stroke="#466258" strokeDasharray="3 3" />
              <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fill: '#a8b9b1', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#a8b9b1', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#17332a', border: '1px solid rgba(244, 239, 226, 0.3)', borderRadius: 6, fontSize: 12 }}
                formatter={(value: number) => [`${value} countries`, 'Count']}
                labelFormatter={(_, payload) => payload[0] ? `${metric.format(payload[0].payload.from)} to ${metric.format(payload[0].payload.to)}` : ''}
              />
              <Bar dataKey="countries" radius={[3, 3, 0, 0]}>
                {bins.map((bin, index) => <Cell key={bin.label} fill={index === bins.length - 1 ? '#72bd8c' : '#63c7b2'} fillOpacity={0.55 + index * 0.05} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card border-[#f4efe2]/30 bg-[#1d3930] p-4 shadow-[0_14px_30px_rgba(2,16,12,0.2)]">
        <div className="border-b border-surface-700/80 pb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent-blue">Country context</p>
          <h3 className="mt-1 text-sm font-semibold text-white">Income and life expectancy</h3>
        </div>
        <p className="mt-3 text-xs text-slate-400">Each point is a country in {endYear}; the highlighted point is the selected country.</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 10, bottom: 6, left: 4 }}>
              <CartesianGrid stroke="#466258" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="gdp" name="GDP / capita" domain={['dataMin', 'dataMax']} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fill: '#a8b9b1', fontSize: 10 }} />
              <YAxis type="number" dataKey="lifeExpectancy" name="Life expectancy" unit=" yrs" domain={['dataMin - 3', 'dataMax + 3']} tick={{ fill: '#a8b9b1', fontSize: 10 }} width={38} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#17332a', border: '1px solid rgba(244, 239, 226, 0.3)', borderRadius: 6, fontSize: 12 }}
                formatter={(value: number, name) => [name === 'GDP / capita' ? `$${Math.round(value).toLocaleString()}` : `${value.toFixed(1)} yrs`, name]}
                labelFormatter={(_, payload) => payload[0]?.payload?.countryName ?? ''}
              />
              <Scatter data={scatterData} fill="#63c7b2" fillOpacity={0.45} />
              <Scatter data={selectedCountry} fill="#e3b869" stroke="#f4efe2" strokeWidth={1.5} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}