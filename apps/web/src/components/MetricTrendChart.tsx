import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { DASHBOARD_COUNTRIES } from '../countryCatalog'
import type { GlobalEntityMetric } from '../types'
import { trackEvent } from '../lib/analytics'

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
  definition: string
  color: string
  format: (value: number) => string
}> = [
  { key: 'gdpPerCapitaUsd', label: 'GDP / capita', definition: 'Economic output per person in current US dollars.', color: '#58a6ff', format: (v) => `$${v.toLocaleString()}` },
  { key: 'population', label: 'Population', definition: 'Total number of people living in the country.', color: '#f59e0b', format: (v) => `${(v / 1_000_000).toFixed(1)}M` },
  { key: 'taxRevenuePctGdp', label: 'Tax revenue % GDP', definition: 'Tax revenue collected as a percentage of gross domestic product.', color: '#06b6d4', format: (v) => `${v.toFixed(1)}%` },
  { key: 'lifeExpectancy', label: 'Life expectancy', definition: 'Average years a person is expected to live at birth.', color: '#facc15', format: (v) => `${v.toFixed(1)} yrs` },
  { key: 'daly100k', label: 'DALYs / 100k', definition: 'Healthy life years lost to illness and early death per 100,000 people.', color: '#f85149', format: (v) => v.toLocaleString() },
  { key: 'giniCoefficient', label: 'Gini', definition: 'Income inequality measure, where higher values indicate more inequality.', color: '#8b5cf6', format: (v) => v.toFixed(1) },
  { key: 'urbanPopulationPct', label: 'Urban pop %', definition: 'Share of the population living in urban areas.', color: '#22c55e', format: (v) => `${v.toFixed(1)}%` },
  { key: 'internetPenetrationPct', label: 'Internet access %', definition: 'Share of the population using the internet.', color: '#14b8a6', format: (v) => `${v.toFixed(1)}%` },
  { key: 'renewableSharePct', label: 'Renewables', definition: 'Share of total energy supply from renewable sources.', color: '#3fb950', format: (v) => `${v.toFixed(1)}%` },
  { key: 'primaryEnergyTwh', label: 'Primary energy', definition: 'Total primary energy consumption in terawatt-hours.', color: '#c084fc', format: (v) => `${v.toLocaleString()} TWh` },
]

/** Distinct hues for country lines, in assignment order */
const COUNTRY_COLORS = ['#58a6ff', '#f85149', '#3fb950', '#f59e0b', '#bc8cff']
const MAX_COUNTRIES = 5

export interface CountrySeries {
  iso3: string
  name: string
  data: GlobalEntityMetric[]
}

interface MetricTrendChartProps {
  data: GlobalEntityMetric[]
  comparison?: CountrySeries[]
  onCountryToggle?: (iso3: string) => void
  selectedIso3: string
  onSelectedCountryChange: (iso3: string) => void
  startYear: number
  endYear: number
  onRangeChange: (startYear: number, endYear: number) => void
}

interface LineSpec {
  id: string
  label: string
  color: string
  metricKey: MetricKey
  actual: (year: number) => number | null
}

export default function MetricTrendChart({
  data,
  comparison = [],
  onCountryToggle,
  selectedIso3,
  onSelectedCountryChange,
  startYear,
  endYear,
  onRangeChange,
}: MetricTrendChartProps) {
  const [mode, setMode] = useState<'metrics' | 'countries'>('metrics')
  const [scale, setScale] = useState<'index' | 'actual'>('index')
  const [selectedKeys, setSelectedKeys] = useState<MetricKey[]>([
    'gdpPerCapitaUsd',
    'lifeExpectancy',
    'renewableSharePct',
  ])
  const [countryMetric, setCountryMetric] = useState<MetricKey>('lifeExpectancy')
  const [showInfo, setShowInfo] = useState(false)
  const [showMeasureCount, setShowMeasureCount] = useState(false)
  const [showCountryCount, setShowCountryCount] = useState(false)
  const measureSummaryRef = useRef<HTMLElement>(null)
  const measureTextRef = useRef<HTMLSpanElement>(null)
  const countrySummaryRef = useRef<HTMLElement>(null)
  const countryTextRef = useRef<HTMLSpanElement>(null)
  const filterYears = Array.from({ length: 37 }, (_, index) => 1990 + index)

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
  const selectedMeasureLabels = METRICS
    .filter((metric) => selectedKeys.includes(metric.key))
    .map((metric) => metric.label)
    .join(', ')
  const comparisonCountries = comparison.filter((series) => series.iso3 !== selectedIso3)
  const selectedComparisonLabels = comparisonCountries.map((country) => country.name).join(', ')

  useLayoutEffect(() => {
    const summary = measureSummaryRef.current
    const measureText = measureTextRef.current
    if (!summary || !measureText) return

    const updateDisplay = () => {
      setShowMeasureCount(measureText.getBoundingClientRect().width > summary.clientWidth - 24)
    }

    updateDisplay()
    const observer = new ResizeObserver(updateDisplay)
    observer.observe(summary)
    return () => observer.disconnect()
  }, [selectedMeasureLabels])

  useLayoutEffect(() => {
    const summary = countrySummaryRef.current
    const countryText = countryTextRef.current
    if (!summary || !countryText) return

    const updateDisplay = () => {
      setShowCountryCount(countryText.getBoundingClientRect().width > summary.clientWidth - 24)
    }

    updateDisplay()
    const observer = new ResizeObserver(updateDisplay)
    observer.observe(summary)
    return () => observer.disconnect()
  }, [selectedComparisonLabels])

  const toggleMetric = (key: MetricKey) => {
    setSelectedKeys((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      trackEvent('metric_selected', {
        metric: key,
        metricLabel: METRICS.find((metric) => metric.key === key)?.label ?? key,
        selectedKeys: next,
        mode,
        scale,
      })
      return next
    })
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

  const filterLabel = (label: string, description: string) => (
    <span className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">
      {label}
      <span className="group/info relative inline-flex">
        <Info size={11} className="text-slate-500" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-52 -translate-x-1/2 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[10px] font-normal normal-case leading-4 tracking-normal text-slate-300 opacity-0 shadow-xl transition group-hover/info:opacity-100">
          {description}
        </span>
      </span>
    </span>
  )

  return (
    <div className="card space-y-5 border-[#f4efe2]/30 bg-[#1d3930] p-3 shadow-[0_14px_30px_rgba(2,16,12,0.2)] sm:p-5">
      <div className="space-y-4 border-b border-surface-700/80 pb-4">
        <div className="relative flex flex-wrap items-end gap-x-3 gap-y-3">
            <h3 className="basis-full text-base font-semibold text-gray-100">
              Metric Trends
            </h3>
            <div className="flex flex-wrap items-end gap-2 border-l border-surface-600/80 pl-3">
                <div className="flex flex-col gap-1.5">
                  {filterLabel('Country', 'The baseline country used for metric trends and country comparisons.')}
                  <label className="sr-only" htmlFor="overview-country-filter">Country</label>
                  <select
                    id="overview-country-filter"
                    value={selectedIso3}
                    onChange={(event) => onSelectedCountryChange(event.target.value)}
                    aria-label="Select overview country"
                    className="max-w-[min(14rem,calc(100vw-7rem))] rounded-md border border-surface-600/80 bg-surface-900 px-2.5 py-1.5 text-[11px] font-medium text-gray-200 [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
                  >
                    {DASHBOARD_COUNTRIES.map((country) => (
                      <option key={country.iso3} value={country.iso3}>{country.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  {filterLabel('Period', 'The inclusive year range shown in the chart and used to calculate index changes.')}
                  <div className="flex items-center gap-1 text-slate-500">
                    <label className="sr-only" htmlFor="overview-start-year">Start year</label>
                    <select
                      id="overview-start-year"
                      value={startYear}
                      onChange={(event) => onRangeChange(Math.min(Number(event.target.value), endYear), endYear)}
                      className="rounded-md border border-surface-600/80 bg-surface-900 px-1.5 py-1.5 font-mono text-[11px] text-slate-300 [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
                    >
                      {filterYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <span className="text-[10px]">-</span>
                    <label className="sr-only" htmlFor="overview-end-year">End year</label>
                    <select
                      id="overview-end-year"
                      value={endYear}
                      onChange={(event) => onRangeChange(startYear, Math.max(Number(event.target.value), startYear))}
                      className="rounded-md border border-surface-600/80 bg-surface-900 px-1.5 py-1.5 font-mono text-[11px] text-slate-300 [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
                    >
                      {filterYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>
            </div>
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
            <div className="flex flex-col gap-1.5">
              {filterLabel('Compare', 'Switch between comparing measures for one country or one measure across countries.')}
              <div className="flex rounded-md border border-surface-600/80 bg-surface-900 p-0.5" aria-label="Chart mode">
              <button type="button" onClick={() => { setMode('metrics'); trackEvent('metric_trend_mode_changed', { mode: 'metrics', modeLabel: 'Metrics', scale, selectedKeys }) }} aria-pressed={mode === 'metrics'} className={toggleClass(mode === 'metrics')}>
                Metrics
              </button>
              <button type="button" onClick={() => { setMode('countries'); trackEvent('metric_trend_mode_changed', { mode: 'countries', modeLabel: 'Countries', scale, selectedKeys, countryMetric }) }} aria-pressed={mode === 'countries'} className={toggleClass(mode === 'countries')}>
                Countries
              </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {filterLabel('View as', 'Index normalizes each series to 100 in the first year. Actual shows source values.')}
              <div className="flex rounded-md border border-surface-600/80 bg-surface-900 p-0.5" aria-label="Y-axis scale">
              <button type="button" onClick={() => { setScale('index'); trackEvent('metric_trend_scale_changed', { scale: 'index', scaleLabel: 'Index', mode, selectedKeys, countryMetric }) }} aria-pressed={scale === 'index'} className={toggleClass(scale === 'index')}>
                Index
              </button>
              <button type="button" onClick={() => { setScale('actual'); trackEvent('metric_trend_scale_changed', { scale: 'actual', scaleLabel: 'Actual', mode, selectedKeys, countryMetric }) }} aria-pressed={scale === 'actual'} className={toggleClass(scale === 'actual')}>
                Actual
              </button>
              </div>
            </div>
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              {filterLabel('Selected Measures', 'Choose the measures displayed as lines when comparing metrics.')}
              {mode === 'metrics' ? (
                <details className="group relative w-full" aria-label="Select trend metrics">
                  <summary
                    ref={measureSummaryRef}
                    className="relative block w-full cursor-pointer list-none truncate rounded-md border border-surface-600/80 bg-surface-900 px-3 py-1.5 text-[11px] font-medium text-gray-200 marker:content-none hover:border-surface-500"
                    title={selectedMeasureLabels}
                  >
                    <span ref={measureTextRef} className="fixed invisible whitespace-nowrap">
                      {selectedMeasureLabels || 'No measures selected'}
                    </span>
                    {showMeasureCount ? `${selectedKeys.length} measures selected` : selectedMeasureLabels || 'No measures selected'}
                  </summary>
                  <div className="absolute left-0 top-full z-30 mt-2 grid w-full grid-cols-1 gap-1 rounded-md border border-surface-600 bg-surface-900 p-2 shadow-xl shadow-black/40">
                    {METRICS.map((metric) => {
                      const active = selectedKeys.includes(metric.key)
                      return (
                        <label key={metric.key} className="group/metric relative flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] text-gray-300 hover:bg-surface-700">
                          <input type="checkbox" checked={active} onChange={() => toggleMetric(metric.key)} className="accent-accent-blue" />
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: metric.color }} />
                          <span>{metric.label}</span>
                          <Info size={12} className="ml-auto text-slate-500" aria-hidden="true" />
                          <span className="pointer-events-none absolute bottom-full left-2 z-40 mb-1 w-64 rounded-md border border-surface-600 bg-surface-900 p-2 text-[10px] leading-4 text-slate-300 opacity-0 shadow-xl transition group-hover/metric:opacity-100">
                            {metric.definition}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </details>
              ) : (
                <select
                  value={countryMetric}
                  onChange={(e) => {
                    const next = e.target.value as MetricKey
                    setCountryMetric(next)
                    trackEvent('filter_changed', {
                      filter: 'country_metric',
                      value: next,
                      valueLabel: METRICS.find((metric) => metric.key === next)?.label ?? next,
                      mode,
                      scale,
                    })
                  }}
                  aria-label="Comparison metric"
                  className="w-full rounded-md border border-surface-600/80 bg-surface-900 px-2.5 py-1.5 text-[11px] text-gray-200 [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
                >
                  {METRICS.map((metric) => (
                    <option key={metric.key} value={metric.key}>{metric.label}</option>
                  ))}
                </select>
              )}
            </div>
        </div>

        {mode === 'countries' && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex w-full flex-col gap-1.5">
              {filterLabel('Countries to Compare Against', 'Add up to four countries to compare with the selected baseline country.')}
              <details className="group relative w-full" aria-label="Countries to compare against">
                <summary
                  ref={countrySummaryRef}
                  className="relative block w-full cursor-pointer list-none truncate rounded-md border border-surface-600/80 bg-surface-900 px-3 py-1.5 text-[11px] font-medium text-gray-200 marker:content-none hover:border-surface-500"
                  title={selectedComparisonLabels}
                >
                  <span ref={countryTextRef} className="fixed invisible whitespace-nowrap">
                    {selectedComparisonLabels || '+ Country'}
                  </span>
                  {showCountryCount ? `${comparisonCountries.length} countries selected` : selectedComparisonLabels || '+ Country'}
                </summary>
                <div className="absolute left-0 top-full z-30 mt-2 grid w-full grid-cols-1 gap-1 rounded-md border border-surface-600 bg-surface-900 p-2 shadow-xl shadow-black/40 sm:grid-cols-2 lg:grid-cols-3">
                  {DASHBOARD_COUNTRIES.filter((country) => country.iso3 !== selectedIso3).map((country) => {
                    const selected = comparisonCountries.some((series) => series.iso3 === country.iso3)
                    const maximumReached = !selected && comparisonCountries.length >= MAX_COUNTRIES - 1
                    return (
                      <label key={country.iso3} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] text-gray-300 hover:bg-surface-700 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={maximumReached}
                          onChange={() => {
                            onCountryToggle?.(country.iso3)
                            trackEvent('country_comparison_toggled', {
                              iso3: country.iso3,
                              countryName: country.name,
                              action: selected ? 'remove' : 'add',
                              mode,
                              scale,
                              countryMetric,
                            })
                          }}
                          className="accent-accent-blue"
                        />
                        <span>{country.name}</span>
                      </label>
                    )
                  })}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-[#f4efe2]/20 bg-[#132d26] px-1 pt-3 sm:px-2">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#466258" />
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
            contentStyle={{ background: '#17332a', border: '1px solid rgba(244, 239, 226, 0.3)', borderRadius: 8, fontSize: 12 }}
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
    </div>
  )
}
