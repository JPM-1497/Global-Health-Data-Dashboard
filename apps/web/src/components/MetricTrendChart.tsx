import { useMemo, useState } from 'react'
import { Info, X } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GlobalEntityMetric } from '../types'

type MetricKey =
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

const METRICS: Array<{
  key: MetricKey
  label: string
  color: string
  format: (value: number) => string
}> = [
  { key: 'gdpPerCapitaUsd', label: 'GDP / capita', color: '#58a6ff', format: (v) => `$${v.toLocaleString()}` },
  { key: 'population', label: 'Population', color: '#f59e0b', format: (v) => `${(v / 1_000_000).toFixed(1)}M` },
  { key: 'taxRevenuePctGdp', label: 'Tax revenue % GDP', color: '#06b6d4', format: (v) => `${v.toFixed(1)}%` },
  { key: 'lifeExpectancy', label: 'Life expectancy', color: '#facc15', format: (v) => `${v.toFixed(1)} yrs` },
  { key: 'daly100k', label: 'DALYs / 100k', color: '#f85149', format: (v) => v.toLocaleString() },
  { key: 'giniCoefficient', label: 'Gini', color: '#8b5cf6', format: (v) => v.toFixed(1) },
  { key: 'urbanPopulationPct', label: 'Urban pop %', color: '#22c55e', format: (v) => `${v.toFixed(1)}%` },
  { key: 'internetPenetrationPct', label: 'Internet access %', color: '#14b8a6', format: (v) => `${v.toFixed(1)}%` },
  { key: 'renewableSharePct', label: 'Renewables', color: '#3fb950', format: (v) => `${v.toFixed(1)}%` },
  { key: 'primaryEnergyTwh', label: 'Primary energy', color: '#c084fc', format: (v) => `${v.toLocaleString()} TWh` },
]

/** Distinct hues for country lines, in assignment order */
const COUNTRY_COLORS = ['#58a6ff', '#f85149', '#3fb950', '#f59e0b', '#bc8cff']
const MAX_COUNTRIES = 5

const ALL_COUNTRIES: Array<{ iso3: string; name: string }> = [
  { iso3: 'USA', name: 'United States' },
  { iso3: 'CHN', name: 'China' },
  { iso3: 'IND', name: 'India' },
  { iso3: 'DEU', name: 'Germany' },
  { iso3: 'GBR', name: 'United Kingdom' },
  { iso3: 'BRA', name: 'Brazil' },
  { iso3: 'NGA', name: 'Nigeria' },
  { iso3: 'ZAF', name: 'South Africa' },
  { iso3: 'JPN', name: 'Japan' },
  { iso3: 'AUS', name: 'Australia' },
]

export interface CountrySeries {
  iso3: string
  name: string
  data: GlobalEntityMetric[]
}

interface MetricTrendChartProps {
  data: GlobalEntityMetric[]
  comparison?: CountrySeries[]
  onCountryToggle?: (iso3: string) => void
}

interface LineSpec {
  id: string
  label: string
  color: string
  metricKey: MetricKey
  actual: (year: number) => number | null
}

export default function MetricTrendChart({ data, comparison = [], onCountryToggle }: MetricTrendChartProps) {
  const [mode, setMode] = useState<'metrics' | 'countries'>('metrics')
  const [scale, setScale] = useState<'index' | 'actual'>('index')
  const [selectedKeys, setSelectedKeys] = useState<MetricKey[]>([
    'gdpPerCapitaUsd',
    'lifeExpectancy',
    'renewableSharePct',
  ])
  const [countryMetric, setCountryMetric] = useState<MetricKey>('lifeExpectancy')
  const [showInfo, setShowInfo] = useState(false)

  const sorted = useMemo(() => [...data].sort((left, right) => left.year - right.year), [data])

  const lines: LineSpec[] = useMemo(() => {
    if (mode === 'metrics') {
      return METRICS.filter((m) => selectedKeys.includes(m.key)).map((m) => {
        const byYear = new Map<number, unknown>(sorted.map((row) => [row.year, row[m.key]]))
        return {
          id: m.key,
          label: m.label,
          color: m.color,
          metricKey: m.key,
          actual: (year: number) => {
            const v = byYear.get(year)
            return typeof v === 'number' ? v : null
          },
        }
      })
    }
    return comparison.map((series, i) => {
      const byYear = new Map<number, unknown>(series.data.map((row) => [row.year, row[countryMetric]]))
      return {
        id: series.iso3,
        label: series.name,
        color: COUNTRY_COLORS[i % COUNTRY_COLORS.length],
        metricKey: countryMetric,
        actual: (year: number) => {
          const v = byYear.get(year)
          return typeof v === 'number' ? v : null
        },
      }
    })
  }, [mode, selectedKeys, countryMetric, sorted, comparison])

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const row of sorted) set.add(row.year)
    if (mode === 'countries') {
      for (const series of comparison) for (const row of series.data) set.add(row.year)
    }
    return [...set].sort((a, b) => a - b)
  }, [mode, sorted, comparison])

  const chartData = useMemo(() => {
    const baselines = new Map<string, number>()
    if (scale === 'index') {
      for (const line of lines) {
        for (const year of years) {
          const value = line.actual(year)
          if (value != null && value !== 0) {
            baselines.set(line.id, value)
            break
          }
        }
      }
    }
    return years.map((year) => {
      const point: Record<string, number> = { year }
      for (const line of lines) {
        const value = line.actual(year)
        if (value == null) continue
        const baseline = baselines.get(line.id)
        point[line.id] = scale === 'index' && baseline ? (value / baseline) * 100 : value
      }
      return point
    })
  }, [lines, years, scale])

  const activeMetric = METRICS.find((m) => m.key === countryMetric)

  const toggleMetric = (key: MetricKey) => {
    setSelectedKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key])
  }

  const yFormatter = (value: number) => {
    if (scale === 'index') return `${value.toFixed(0)}`
    if (mode === 'countries' && activeMetric) return activeMetric.format(value)
    return value >= 10000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
  }

  const toggleClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
      active ? 'bg-accent-blue/20 text-accent-blue' : 'text-gray-500 hover:text-gray-300'
    }`

  const availableCountries = ALL_COUNTRIES.filter((c) => !comparison.some((s) => s.iso3 === c.iso3))

  return (
    <div className="card space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-200">
              {mode === 'metrics' ? 'Metric trends' : `${activeMetric?.label ?? 'Metric'} — country comparison`}
            </h3>
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              aria-label="How to read this chart"
              aria-expanded={showInfo}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-surface-600 text-gray-500 transition-colors hover:border-accent-blue/60 hover:text-accent-blue"
            >
              {showInfo ? <X size={10} /> : <Info size={10} />}
            </button>

            {showInfo && (
              <div className="absolute left-0 top-7 z-20 w-72 rounded-lg border border-surface-600 bg-surface-800 p-3 shadow-xl shadow-black/40">
                <p className="text-xs leading-5 text-gray-400">
                  In <span className="font-semibold text-gray-200">Index</span> view, every line starts at{' '}
                  <span className="font-semibold text-gray-200">100</span> in the first year of your range.
                  A point at <span className="font-semibold text-emerald-400">110</span> means it grew 10% since then;
                  a point at <span className="font-semibold text-red-400">90</span> means it fell 10%.
                  Switch to <span className="font-semibold text-gray-200">Actual</span> for raw values and absolute gaps.
                  Hover any point for the real number.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-surface-600/80 p-0.5" aria-label="Chart mode">
              <button type="button" onClick={() => setMode('metrics')} aria-pressed={mode === 'metrics'} className={toggleClass(mode === 'metrics')}>
                Metrics
              </button>
              <button type="button" onClick={() => setMode('countries')} aria-pressed={mode === 'countries'} className={toggleClass(mode === 'countries')}>
                Countries
              </button>
            </div>
            <div className="flex rounded-full border border-surface-600/80 p-0.5" aria-label="Y-axis scale">
              <button type="button" onClick={() => setScale('index')} aria-pressed={scale === 'index'} className={toggleClass(scale === 'index')}>
                Index
              </button>
              <button type="button" onClick={() => setScale('actual')} aria-pressed={scale === 'actual'} className={toggleClass(scale === 'actual')}>
                Actual
              </button>
            </div>
          </div>
        </div>

        {mode === 'metrics' ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Select trend metrics">
            {METRICS.map((metric) => {
              const active = selectedKeys.includes(metric.key)
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => toggleMetric(metric.key)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                    active
                      ? 'text-gray-100'
                      : 'border-surface-600/70 bg-transparent text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                  style={active ? { backgroundColor: `${metric.color}26`, borderColor: `${metric.color}55` } : undefined}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: active ? metric.color : '#6e7681' }}
                  />
                  {metric.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={countryMetric}
              onChange={(e) => setCountryMetric(e.target.value as MetricKey)}
              aria-label="Comparison metric"
              className="rounded-full border border-surface-600/80 bg-surface-800 px-2.5 py-1 text-[11px] text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-1.5" aria-label="Selected countries">
              {comparison.map((series, i) => (
                <button
                  key={series.iso3}
                  type="button"
                  onClick={() => onCountryToggle?.(series.iso3)}
                  title="Remove country"
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] text-gray-100 transition-all"
                  style={{
                    backgroundColor: `${COUNTRY_COLORS[i % COUNTRY_COLORS.length]}26`,
                    borderColor: `${COUNTRY_COLORS[i % COUNTRY_COLORS.length]}55`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}
                  />
                  {series.name}
                  <X size={9} className="text-gray-400" />
                </button>
              ))}
              {comparison.length < MAX_COUNTRIES && availableCountries.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onCountryToggle?.(e.target.value)
                  }}
                  aria-label="Add country to comparison"
                  className="rounded-full border border-dashed border-surface-600/80 bg-transparent px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-300 focus:outline-none"
                >
                  <option value="">+ Add country</option>
                  {availableCountries.map((c) => (
                    <option key={c.iso3} value={c.iso3}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="year" tick={{ fill: '#8b949e', fontSize: 11 }} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#8b949e', fontSize: 11 }}
            tickFormatter={yFormatter}
            label={{
              value:
                scale === 'index'
                  ? 'Change since start (start = 100)'
                  : mode === 'countries' && activeMetric
                    ? activeMetric.label
                    : 'Value',
              angle: -90,
              position: 'insideLeft',
              fill: '#8b949e',
              fontSize: 11,
            }}
          />
          {scale === 'index' && (
            <ReferenceLine
              y={100}
              stroke="#8b949e"
              strokeDasharray="4 4"
              label={{ value: 'start', position: 'insideTopRight', fill: '#8b949e', fontSize: 10 }}
            />
          )}
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string, item: { payload?: { year?: number } }) => {
              const line = lines.find((l) => l.id === name)
              const year = item?.payload?.year
              const raw = year != null && line ? line.actual(year) : null
              const metric = METRICS.find((m) => m.key === line?.metricKey)
              const rawText = raw != null && metric ? metric.format(raw) : ''
              if (scale === 'index') {
                const pctFromStart = value - 100
                const pctText = `${pctFromStart >= 0 ? '+' : ''}${pctFromStart.toFixed(1)}% vs start`
                return [`${value.toFixed(1)} (${pctText}${rawText ? ` · actual: ${rawText}` : ''})`, line?.label ?? name]
              }
              return [rawText || value.toLocaleString(), line?.label ?? name]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
          {lines.map((line) => (
            <Line
              key={line.id}
              type="monotone"
              dataKey={line.id}
              name={line.label}
              stroke={line.color}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
