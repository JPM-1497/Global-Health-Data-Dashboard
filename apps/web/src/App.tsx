import { useState, useEffect, useCallback } from 'react'
import { Zap, DollarSign, Heart, Landmark, Users, Scale, Wifi, Building2, Activity, Plug } from 'lucide-react'
import Header from './components/Header'
import KpiCard from './components/KpiCard'
import MetricTrendChart, { type CountrySeries } from './components/MetricTrendChart'
import CountryComparisonTable from './components/CountryComparisonTable'
import { COUNTRY_NAMES } from './countryCatalog'
import type { GlobalEntityMetric, ApiDataResponse, KpiMetric } from './types'

interface CountryMetricsResponse {
  data: GlobalEntityMetric[]
  cached: boolean
  year: number
  lastUpdated: string
}

function buildAverageKpis(rows: Array<Partial<GlobalEntityMetric>>): KpiMetric[] {
  const average = (field: keyof GlobalEntityMetric): number | null => {
    const values = rows
      .map((row) => row[field])
      .filter((value): value is number => value != null)

    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + Number(value), 0) / values.length
  }

  const fmt = (v: number | null, prefix = '', suffix = '') =>
    v != null ? `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}` : '—'

  return [
    { label: 'GDP per Capita', value: fmt(average('gdpPerCapitaUsd'), '$'), yoyDelta: null, unit: 'USD' },
    { label: 'Population', value: fmt(average('population')), yoyDelta: null, unit: 'people' },
    { label: 'Tax Revenue', value: fmt(average('taxRevenuePctGdp'), '', '%'), yoyDelta: null, unit: '% of GDP' },
    { label: 'Life Expectancy', value: fmt(average('lifeExpectancy'), '', ' yrs'), yoyDelta: null, unit: 'years' },
    { label: 'DALYs / 100k', value: fmt(average('daly100k')), yoyDelta: null, unit: 'health burden' },
    { label: 'Gini Index', value: fmt(average('giniCoefficient')), yoyDelta: null, unit: '0–100' },
    { label: 'Urban Population', value: fmt(average('urbanPopulationPct'), '', '%'), yoyDelta: null, unit: 'of total' },
    { label: 'Internet Access', value: fmt(average('internetPenetrationPct'), '', '%'), yoyDelta: null, unit: 'of population' },
    { label: 'Renewable Share', value: fmt(average('renewableSharePct'), '', '%'), yoyDelta: null, unit: 'of energy' },
    { label: 'Primary Energy', value: fmt(average('primaryEnergyTwh'), '', ' TWh'), yoyDelta: null, unit: 'consumption' },
  ]
}

export default function App() {
  const [selectedIso3, setSelectedIso3] = useState('USA')
  const [startYear, setStartYear] = useState(2017)
  const [endYear, setEndYear] = useState(2023)
  const [metrics, setMetrics] = useState<GlobalEntityMetric[]>([])
  const [compareIso3s, setCompareIso3s] = useState<string[]>(['USA', 'CAN', 'BRA'])
  const [compareSeries, setCompareSeries] = useState<CountrySeries[]>([])
  const [countryRows, setCountryRows] = useState<GlobalEntityMetric[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'countries'>('overview')

  useEffect(() => {
    const controller = new AbortController()
    setMetrics([])

    async function loadMetrics() {
      try {
        const response = await fetch(
          `/api/data?iso3=${selectedIso3}&startYear=${startYear}&endYear=${endYear}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error('Data API error')
        const payload = await response.json() as ApiDataResponse
        setMetrics(payload.data)
      } catch {
        if (!controller.signal.aborted) setMetrics([])
      }
    }

    loadMetrics()

    return () => controller.abort()
  }, [selectedIso3, startYear, endYear])

  useEffect(() => {
    const controller = new AbortController()

    async function loadComparison() {
      const series = await Promise.all(
        compareIso3s.map(async (iso3) => {
          try {
            const response = await fetch(
              `/api/data?iso3=${iso3}&startYear=${startYear}&endYear=${endYear}`,
              { signal: controller.signal },
            )
            if (!response.ok) throw new Error('Data API error')
            const payload = (await response.json()) as ApiDataResponse
            return { iso3, name: COUNTRY_NAMES[iso3] ?? iso3, data: payload.data }
          } catch {
            if (controller.signal.aborted) return null
            return { iso3, name: COUNTRY_NAMES[iso3] ?? iso3, data: [] }
          }
        }),
      )
      if (controller.signal.aborted) return
      setCompareSeries(series.filter((s): s is CountrySeries => s !== null))
    }

    loadComparison()
    return () => controller.abort()
  }, [compareIso3s, startYear, endYear])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCountryRows() {
      try {
        const response = await fetch(`/api/country-metrics?year=${endYear}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Country metrics API error')
        const payload = (await response.json()) as CountryMetricsResponse
        setCountryRows(payload.data)
      } catch {
        if (!controller.signal.aborted) setCountryRows([])
      }
    }

    loadCountryRows()
    return () => controller.abort()
  }, [endYear])

  const toggleCompareCountry = useCallback((iso3: string) => {
    setCompareIso3s((current) =>
      current.includes(iso3)
        ? current.length > 1
          ? current.filter((item) => item !== iso3)
          : current
        : current.length < 5
          ? [...current, iso3]
          : current,
    )
  }, [])

  const kpis = buildAverageKpis(countryRows)

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header
        title="Global Intelligence Analytics"
        startYear={startYear}
        endYear={endYear}
        onRangeChange={(nextStart, nextEnd) => {
          setStartYear(nextStart)
          setEndYear(nextEnd)
        }}
      />

      <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section aria-label="Average key performance indicators">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Average across all countries
          </p>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className="w-40 shrink-0">
                <KpiCard
                  metric={kpi}
                  period={`${startYear}–${endYear}`}
                  icon={
                    [
                      <DollarSign size={13} />,
                      <Users size={13} />,
                      <Landmark size={13} />,
                      <Heart size={13} />,
                      <Activity size={13} />,
                      <Scale size={13} />,
                      <Building2 size={13} />,
                      <Wifi size={13} />,
                      <Zap size={13} />,
                      <Plug size={13} />,
                    ][i]
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Dashboard content">
          <div className="mb-4 flex gap-1 border-b border-surface-600/60" role="tablist">
            {(['overview', 'countries'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 px-3 pb-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-accent-blue text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'overview' ? 'Overview' : 'Country metrics'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <MetricTrendChart
              data={metrics}
              comparison={compareSeries}
              onCountryToggle={toggleCompareCountry}
            />
          ) : (
            <CountryComparisonTable
              rows={countryRows}
              selectedIso3={selectedIso3}
              onCountrySelect={setSelectedIso3}
              endYear={endYear}
            />
          )}
        </section>
      </main>
    </div>
  )
}
